from __future__ import annotations

from typing import Any
import numpy as np
from scipy.optimize import linprog


def optimize_prescriptions(
    prescriptions: list[dict[str, Any]],
    delay_prob: float,
    est_delay_hours: float,
    max_budget: float,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """
    Uses SciPy linear programming (HiGHS) to select/allocate prescriptive actions
    under a hard budget ceiling using XGBoost delay probability and estimated delay hours.
    """
    if not prescriptions:
        return [], {
            "solver": "scipy.optimize.linprog (highs)",
            "solver_status": "No actions required",
            "recommended_action_id": None,
            "allocated_budget": 0.0,
            "max_allowed_budget": float(max_budget),
            "budget_remaining": float(max_budget),
            "expected_hours_recovered": 0.0,
        }

    costs: list[float] = []
    hours_saved_list: list[float] = []
    feasibility_weight = {"Optimal": 1.0, "High": 1.0, "Medium": 0.85, "Low": 0.65}

    for rec in prescriptions:
        raw_cost = str(rec.get("cost_impact", "0")).replace("$", "").replace("+", "").strip()
        try:
            cost_val = max(0.0, float(raw_cost))
        except ValueError:
            cost_val = 0.0

        raw_hours = str(rec.get("time_saved", "0")).lower().replace("hours", "").replace("hour", "").strip()
        try:
            hours_val = max(0.0, float(raw_hours))
        except ValueError:
            hours_val = 0.0

        feas = feasibility_weight.get(str(rec.get("feasibility", "High")), 0.8)
        costs.append(cost_val)
        hours_saved_list.append(hours_val * feas)

    n = len(prescriptions)
    # Maximize expected delay reduction scaled by delay risk, with slight tie-breaker for lower cost
    # linprog minimizes c^T x, so negate expected benefit and add small cost tie-breaker
    effective_hours = [
        h * (0.25 + 0.75 * max(0.0, min(1.0, float(delay_prob)))) for h in hours_saved_list
    ]
    c = [-((eff_h * 100.0) - (0.05 * cost)) for eff_h, cost in zip(effective_hours, costs)]

    # Constraint 1: total cost <= max_budget
    # Constraint 2: sum(x_i) <= 1.0 (single-action / primary allocation bound)
    A_ub = [
        costs,
        [1.0] * n,
    ]
    b_ub = [
        float(max_budget),
        1.0,
    ]
    bounds = [(0.0, 1.0) for _ in range(n)]

    res = linprog(c, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method="highs")

    allocations = [0.0] * n
    if res.success and res.x is not None:
        allocations = [max(0.0, min(1.0, float(val))) for val in res.x]

    # Pick highest allocated action (fallback to zero-cost action if all allocations are 0)
    best_idx = int(np.argmax(allocations)) if allocations else 0
    if allocations[best_idx] <= 1e-6:
        zero_cost_indices = [i for i, cost in enumerate(costs) if cost <= float(max_budget)]
        best_idx = zero_cost_indices[0] if zero_cost_indices else 0
        allocations = [0.0] * n
        allocations[best_idx] = 1.0

    enriched: list[dict[str, Any]] = []
    for i, rec in enumerate(prescriptions):
        item = dict(rec)
        alloc_pct = round(allocations[i] * 100.0, 1)
        item["recommended_allocation_pct"] = alloc_pct
        item["is_recommended"] = i == best_idx
        enriched.append(item)

    chosen_alloc = allocations[best_idx]
    allocated_budget = round(costs[best_idx] * chosen_alloc, 2)
    recovered_hours = round(min(float(est_delay_hours), hours_saved_list[best_idx] * chosen_alloc), 2)

    summary = {
        "solver": "scipy.optimize.linprog (highs)",
        "solver_status": res.message if res.success else "Fallback optimal selection",
        "recommended_action_id": prescriptions[best_idx].get("action_id"),
        "recommended_action_title": prescriptions[best_idx].get("title"),
        "allocated_budget": allocated_budget,
        "max_allowed_budget": float(max_budget),
        "budget_remaining": round(max(0.0, float(max_budget) - allocated_budget), 2),
        "expected_hours_recovered": recovered_hours,
        "delay_risk_weight": round(float(delay_prob), 4),
    }
    return enriched, summary

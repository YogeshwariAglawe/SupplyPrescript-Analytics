import sqlite3

DB_PATH = "supply_operations.db"

def migrate_and_seed():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    existing_cols = [row[1] for row in cur.execute("PRAGMA table_info(decision_logs)").fetchall()]
    if "actual_cost" not in existing_cols:
        cur.execute("ALTER TABLE decision_logs ADD COLUMN actual_cost REAL")
    if "outcome_status" not in existing_cols:
        cur.execute("ALTER TABLE decision_logs ADD COLUMN outcome_status TEXT")

    # Populate actual outcomes for existing REC-00 optimal rows where actual_cost is NULL
    cur.execute("""
        UPDATE decision_logs
        SET actual_cost = 0.0,
            outcome_status = 'Positive - On Time'
        WHERE action_id = 'REC-00' AND actual_cost IS NULL
    """)

    # Insert historical intervention records with predicted vs actual outcomes if not already seeded
    already_seeded = cur.execute(
        "SELECT COUNT(*) FROM decision_logs WHERE action_id IN ('REC-01', 'REC-02', 'REC-03') AND actual_cost IS NOT NULL"
    ).fetchone()[0]

    if already_seeded == 0:
        sample_outcomes = [
            ("SP-00014", "REC-01", "Re-route via Highway 44 (Avoids Traffic)", "Executed Successfully", 120.0, 115.0, "Positive - Delay Avoided", "2026-11-12 10:15:00"),
            ("SP-00027", "REC-03", "Dispatch Secondary Hub Backup Fleet", "Executed Successfully", 210.0, 205.0, "Positive - Delay Avoided", "2026-11-14 14:40:00"),
            ("SP-00039", "REC-02", "Express Air Freight Upgrade", "Executed Successfully", 450.0, 495.0, "Negative - Cost Overrun", "2026-11-16 09:20:00"),
            ("SP-00044", "REC-01", "Re-route via Highway 44 (Avoids Traffic)", "Executed Successfully", 120.0, 118.0, "Positive - Delay Avoided", "2026-11-18 16:05:00"),
        ]
        cur.executemany("""
            INSERT INTO decision_logs
            (shipment_id, action_id, action_type, status, budget_used, actual_cost, outcome_status, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, sample_outcomes)

    conn.commit()
    rows = cur.execute("SELECT id, shipment_id, action_id, budget_used, actual_cost, outcome_status FROM decision_logs").fetchall()
    for r in rows:
        print(r)
    conn.close()

if __name__ == "__main__":
    migrate_and_seed()

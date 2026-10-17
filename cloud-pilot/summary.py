def make_summary(row):
    visits, unique_patients, eligible, assessed, appropriate, inappropriate = row
    return {
        "visits": visits,
        "uniquePatients": unique_patients,
        "fmtEligibility": {
            "numerator": eligible,
            "denominator": assessed,
            "percent": round(100 * eligible / assessed, 2) if assessed else 0,
        },
        "gdmtAppropriateness": {
            "appropriate": appropriate,
            "inappropriate": inappropriate,
        },
        "dataClass": "synthetic-only",
    }

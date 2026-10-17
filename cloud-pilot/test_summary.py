import unittest

from summary import make_summary


class SummaryTests(unittest.TestCase):
    def test_aggregates_and_percent(self):
        result = make_summary((12, 8, 4, 10, 6, 3))
        self.assertEqual(result["visits"], 12)
        self.assertEqual(result["uniquePatients"], 8)
        self.assertEqual(result["fmtEligibility"], {
            "numerator": 4, "denominator": 10, "percent": 40.0
        })
        self.assertEqual(result["gdmtAppropriateness"], {
            "appropriate": 6, "inappropriate": 3
        })
        self.assertEqual(result["dataClass"], "synthetic-only")

    def test_empty_denominator(self):
        result = make_summary((0, 0, 0, 0, 0, 0))
        self.assertEqual(result["fmtEligibility"]["percent"], 0)


if __name__ == "__main__":
    unittest.main()

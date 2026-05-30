"""
Account 418-378-4250 under MCC 607-955-5378
Fixes all 7 issues found in the readiness audit:
  1. tROAS on both campaigns
  2. Canada geo criterion on pMax - Canada
  3. Max-Signup geo type → PRESENCE
  4. Budget amounts verification/correction
  5. Conversion action creation (CPT Property purchase)

Usage:
  python fix_418.py --credentials secrets/google-ads.yaml

Notes:
  - google-ads.yaml must have login_customer_id: "6079555378"
  - Asset groups + audience signals still need UI (binary file uploads)
"""

import argparse
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException

CUSTOMER_ID = "4183784250"
MCC_ID      = "6079555378"

CAMPAIGN_PMAX_CANADA = "customers/4183784250/campaigns/23898219502"
CAMPAIGN_MAX_SIGNUP  = "customers/4183784250/campaigns/23898221449"
BUDGET_PMAX_CANADA   = "customers/4183784250/campaignBudgets/15607903847"
BUDGET_MAX_SIGNUP    = "customers/4183784250/campaignBudgets/15612739095"

def log(msg):   print(f"    {msg}")
def ok(msg):    print(f"  ✓ {msg}")
def fail(msg):  print(f"  ✗ {msg}")

def handle_error(ex):
    for e in ex.failure.errors:
        fail(f"{e.message}")


# ─────────────────────────────────────────────────────────────
# FIX 1 — tROAS on both campaigns
# ─────────────────────────────────────────────────────────────
def fix_troas(client):
    print("\n[1/5] Setting tROAS...")
    svc = client.get_service("CampaignService")
    ops = []

    for rn, troas, name in [
        (CAMPAIGN_PMAX_CANADA, 1.6, "pMax - Canada"),
        (CAMPAIGN_MAX_SIGNUP,  1.2, "Max-Signup"),
    ]:
        op = client.get_type("CampaignOperation")
        c  = op.update
        c.resource_name = rn
        c.maximize_conversion_value.target_roas = troas
        op.update_mask.paths.append("maximize_conversion_value.target_roas")
        ops.append(op)
        log(f"{name} → tROAS {troas}")

    try:
        svc.mutate_campaigns(customer_id=CUSTOMER_ID, operations=ops)
        ok("tROAS set on both campaigns")
    except GoogleAdsException as ex:
        handle_error(ex)


# ─────────────────────────────────────────────────────────────
# FIX 2 — Canada geo criterion on pMax - Canada
# ─────────────────────────────────────────────────────────────
def fix_geo_canada(client):
    print("\n[2/5] Adding Canada geo target to pMax - Canada...")
    svc = client.get_service("CampaignCriterionService")

    # First check if it already exists
    ga_svc  = client.get_service("GoogleAdsService")
    query   = """
        SELECT campaign_criterion.resource_name,
               campaign_criterion.location.geo_target_constant,
               campaign_criterion.negative
        FROM   campaign_criterion
        WHERE  campaign.resource_name = '{}'
          AND  campaign_criterion.type = 'LOCATION'
    """.format(CAMPAIGN_PMAX_CANADA)

    existing = []
    try:
        response = ga_svc.search(customer_id=CUSTOMER_ID, query=query)
        for row in response:
            existing.append(row.campaign_criterion.location.geo_target_constant)
    except GoogleAdsException as ex:
        handle_error(ex)

    CANADA = "geoTargetConstants/2124"
    if any(CANADA in e for e in existing):
        ok("Canada geo target already present — skipping")
        return

    op   = client.get_type("CampaignCriterionOperation")
    cr   = op.create
    cr.campaign                     = CAMPAIGN_PMAX_CANADA
    cr.location.geo_target_constant = CANADA
    cr.negative                     = False

    try:
        svc.mutate_campaign_criteria(customer_id=CUSTOMER_ID, operations=[op])
        ok("Canada (geoTargetConstants/2124) added to pMax - Canada")
    except GoogleAdsException as ex:
        handle_error(ex)


# ─────────────────────────────────────────────────────────────
# FIX 3 — Max-Signup geo type → PRESENCE only
# ─────────────────────────────────────────────────────────────
def fix_geo_type(client):
    print("\n[3/5] Fixing Max-Signup geo type → PRESENCE...")
    svc = client.get_service("CampaignService")

    op = client.get_type("CampaignOperation")
    c  = op.update
    c.resource_name = CAMPAIGN_MAX_SIGNUP
    c.geo_target_type_setting.positive_geo_target_type = (
        client.enums.PositiveGeoTargetTypeEnum.PRESENCE
    )
    op.update_mask.paths.append(
        "geo_target_type_setting.positive_geo_target_type"
    )

    try:
        svc.mutate_campaigns(customer_id=CUSTOMER_ID, operations=[op])
        ok("Max-Signup geo type → PRESENCE")
    except GoogleAdsException as ex:
        handle_error(ex)


# ─────────────────────────────────────────────────────────────
# FIX 4 — Verify + correct budget amounts
# ─────────────────────────────────────────────────────────────
def fix_budgets(client):
    print("\n[4/5] Verifying and correcting budgets...")
    svc    = client.get_service("CampaignBudgetService")
    ga_svc = client.get_service("GoogleAdsService")

    expected = {
        BUDGET_PMAX_CANADA: ("pMax - Canada", 170),
        BUDGET_MAX_SIGNUP:  ("Max-Signup",    240),
    }

    query = """
        SELECT campaign_budget.resource_name,
               campaign_budget.name,
               campaign_budget.amount_micros
        FROM   campaign_budget
        WHERE  campaign_budget.resource_name IN ('{}', '{}')
    """.format(BUDGET_PMAX_CANADA, BUDGET_MAX_SIGNUP)

    current = {}
    try:
        for row in ga_svc.search(customer_id=CUSTOMER_ID, query=query):
            b = row.campaign_budget
            current[b.resource_name] = b.amount_micros / 1_000_000
    except GoogleAdsException as ex:
        handle_error(ex)
        return

    ops = []
    for rn, (name, target_cad) in expected.items():
        actual = current.get(rn)
        if actual is None:
            fail(f"{name}: budget not found")
            continue
        log(f"{name}: current ${actual:.0f}/day  →  target ${target_cad}/day")
        if abs(actual - target_cad) > 0.01:
            op = client.get_type("CampaignBudgetOperation")
            b  = op.update
            b.resource_name   = rn
            b.amount_micros   = int(target_cad * 1_000_000)
            op.update_mask.paths.append("amount_micros")
            ops.append(op)
        else:
            ok(f"{name} budget already correct (${actual:.0f}/day)")

    if ops:
        try:
            svc.mutate_campaign_budgets(customer_id=CUSTOMER_ID, operations=ops)
            ok("Budget amounts corrected")
        except GoogleAdsException as ex:
            handle_error(ex)


# ─────────────────────────────────────────────────────────────
# FIX 5 — Create conversion action (CPT Property purchase)
# ─────────────────────────────────────────────────────────────
def fix_conversion_action(client):
    print("\n[5/5] Creating conversion action 'CPT Property purchase'...")
    ga_svc = client.get_service("GoogleAdsService")

    # Check if already exists
    query = """
        SELECT conversion_action.name, conversion_action.status
        FROM   conversion_action
        WHERE  conversion_action.status != 'REMOVED'
    """
    try:
        for row in ga_svc.search(customer_id=CUSTOMER_ID, query=query):
            name = row.conversion_action.name
            if "purchase" in name.lower():
                ok(f"Purchase conversion already exists: '{name}' — skipping")
                return
            log(f"Existing conversion: {name}")
    except GoogleAdsException as ex:
        handle_error(ex)
        return

    svc = client.get_service("ConversionActionService")
    op  = client.get_type("ConversionActionOperation")
    ca  = op.create

    ca.name                          = "CPT Property purchase"
    ca.status                        = client.enums.ConversionActionStatusEnum.ENABLED
    ca.type_                         = client.enums.ConversionActionTypeEnum.WEBPAGE
    ca.category                      = client.enums.ConversionActionCategoryEnum.PURCHASE
    ca.counting_type                 = client.enums.ConversionActionCountingTypeEnum.ONE_PER_CLICK
    ca.value_settings.default_value  = 47.0

    try:
        resp = svc.mutate_conversion_actions(customer_id=CUSTOMER_ID, operations=[op])
        rn   = resp.results[0].resource_name

        update_op = client.get_type("ConversionActionOperation")
        updated = update_op.update
        updated.resource_name = rn
        updated.include_in_conversions_metric = True
        updated.value_settings.always_use_default_value = False
        update_op.update_mask.paths.extend([
            "include_in_conversions_metric",
            "value_settings.always_use_default_value",
        ])
        svc.mutate_conversion_actions(
            customer_id=CUSTOMER_ID, operations=[update_op]
        )
        ok(f"Conversion action created: {rn}")
        print()
        print("  ⚠  Next step: install the Google tag on celpippt.com and fire")
        print("     the purchase event on successful subscription. Tag snippet")
        print("     available in UI: Goals → Conversions → CPT Property purchase → Tag setup")
    except GoogleAdsException as ex:
        handle_error(ex)


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--credentials", default="secrets/google-ads.yaml")
    parser.add_argument("--step", type=int, default=0,
                        help="1=tROAS 2=geo-canada 3=geo-type 4=budgets 5=conversion  0=all")
    args = parser.parse_args()

    print("=" * 60)
    print(f"MCC {MCC_ID}  →  Account {CUSTOMER_ID}")
    print("Readiness fixes")
    print("=" * 60)

    client = GoogleAdsClient.load_from_storage(args.credentials)

    steps = {
        1: fix_troas,
        2: fix_geo_canada,
        3: fix_geo_type,
        4: fix_budgets,
        5: fix_conversion_action,
    }

    run = [steps[args.step]] if args.step else steps.values()
    for fn in run:
        fn(client)

    print("\n" + "=" * 60)
    print("Script complete.")
    print()
    print("Remaining items that need the UI (binary uploads):")
    print("  A. Add creatives to each asset group:")
    print("     pMax - Canada → 3+ headlines, 2+ descriptions, 1 image, 1 logo")
    print("     Max-Signup    → 3+ headlines, 2+ descriptions, 1 image, 1 logo")
    print("  B. Upload Stripe customer list as audience signal on pMax - Canada:")
    print("     Tools → Audience manager → + → Customer list → upload CSV of emails")
    print("     Then: pMax - Canada → Asset groups → Audience signals → add that list")
    print("  C. Enable pMax - Canada once creatives + conversion tag are live")
    print("     Wait 2 weeks → then enable Max-Signup")
    print("=" * 60)

if __name__ == "__main__":
    main()
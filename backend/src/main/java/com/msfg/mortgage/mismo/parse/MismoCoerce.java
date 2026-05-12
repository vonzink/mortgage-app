package com.msfg.mortgage.mismo.parse;

import java.math.BigDecimal;

/**
 * Pure value-coercion helpers used during MISMO import. Each one is null-safe
 * and forgiving of the various string forms MISMO emits (long-form type names,
 * unpunctuated phone numbers, raw 9-digit ZIPs, etc.).
 */
public final class MismoCoerce {
    private MismoCoerce() {}

    public static BigDecimal parseDecimal(String s) {
        if (s == null || s.isBlank()) return null;
        try { return new BigDecimal(s); } catch (NumberFormatException e) { return null; }
    }

    /** Return the first non-null/non-blank string from the candidates. */
    public static String firstNonNull(String... candidates) {
        for (String c : candidates) {
            if (c != null && !c.isBlank()) return c;
        }
        return null;
    }

    /** MISMO indicators come through as "true"/"false" or "Y"/"N" or "1"/"0". */
    public static Boolean parseBool(String s) {
        if (s == null || s.isBlank()) return null;
        String t = s.trim();
        if (t.equalsIgnoreCase("true") || t.equalsIgnoreCase("yes") || t.equals("Y") || t.equals("1")) return true;
        if (t.equalsIgnoreCase("false") || t.equalsIgnoreCase("no") || t.equals("N") || t.equals("0")) return false;
        return null;
    }

    /**
     * Convert any phone-shaped string into the {@code 123-456-7890} format that
     * Employment.employerPhone and similar bean-validated fields require.
     *
     * <ul>
     *   <li>null / blank → null</li>
     *   <li>10 digits (any punctuation stripped) → reformatted with dashes</li>
     *   <li>11 digits starting with 1 (US country code) → drop the 1, reformat</li>
     *   <li>Already in canonical {@code 123-456-7890} → passed through</li>
     *   <li>Anything else → returned as-is so the validator can surface a real error
     *       instead of us silently swallowing data we don't understand</li>
     * </ul>
     */
    public static String normalizePhone(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return null;
        if (trimmed.matches("\\d{3}-\\d{3}-\\d{4}")) return trimmed;
        String digits = trimmed.replaceAll("\\D", "");
        if (digits.length() == 11 && digits.startsWith("1")) digits = digits.substring(1);
        if (digits.length() == 10) {
            return digits.substring(0, 3) + "-" + digits.substring(3, 6) + "-" + digits.substring(6);
        }
        return trimmed;
    }

    /**
     * Map MISMO {@code AssetType} values onto the short forms the {@code Asset} entity's
     * {@code @Pattern} accepts. Unknown / blank values fall through to {@code "Other"}
     * so a single unfamiliar type from a future MISMO version never blocks an import.
     *
     * <p>Allowed entity values are:
     * Checking | Savings | MoneyMarket | CertificateOfDeposit | MutualFunds | Stocks |
     * Bonds | Retirement401k | IRA | Pension | EarnestMoney | Other.
     */
    public static String normalizeAssetType(String raw) {
        if (raw == null || raw.isBlank()) return "Other";
        String s = raw.trim();
        switch (s) {
            // exact matches first — entity values pass through
            case "Checking": case "Savings": case "MoneyMarket":
            case "CertificateOfDeposit": case "MutualFunds": case "Stocks":
            case "Bonds": case "Retirement401k": case "IRA": case "Pension":
            case "EarnestMoney": case "Other":
                return s;
            // MISMO 3.4 long forms → entity short forms
            case "CheckingAccount":                         return "Checking";
            case "SavingsAccount":                          return "Savings";
            case "MoneyMarketFund":                         return "MoneyMarket";
            case "MutualFund":                              return "MutualFunds";
            case "Stock":                                   return "Stocks";
            case "Bond":                                    return "Bonds";
            case "RetirementFund":                          return "Retirement401k";
            case "IndividualRetirementAccount":             return "IRA";
            case "EarnestMoneyCashDeposit":
            case "EarnestMoneyDeposit":                     return "EarnestMoney";
            default:
                return "Other";
        }
    }

    /**
     * Convert a postal-code value to {@code 12345} or {@code 12345-6789} format.
     * 9 raw digits becomes the dashed ZIP+4 form; everything else passes through.
     */
    public static String normalizeZip(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return null;
        if (trimmed.matches("\\d{5}(-\\d{4})?")) return trimmed;
        String digits = trimmed.replaceAll("\\D", "");
        if (digits.length() == 9) return digits.substring(0, 5) + "-" + digits.substring(5);
        if (digits.length() == 5) return digits;
        return trimmed;
    }
}

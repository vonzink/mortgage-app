package com.yourcompany.mortgage.mismo.parse;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class MismoCoerceTest {

    @Test
    void parseDecimal_returnsNullForBlankAndNonNumeric() {
        assertThat(MismoCoerce.parseDecimal(null)).isNull();
        assertThat(MismoCoerce.parseDecimal("")).isNull();
        assertThat(MismoCoerce.parseDecimal("  ")).isNull();
        assertThat(MismoCoerce.parseDecimal("not a number")).isNull();
    }

    @Test
    void parseDecimal_returnsExactBigDecimalForValidInput() {
        assertThat(MismoCoerce.parseDecimal("1234.56")).isEqualByComparingTo(new BigDecimal("1234.56"));
        assertThat(MismoCoerce.parseDecimal("0")).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void parseBool_acceptsManyTruthyForms() {
        assertThat(MismoCoerce.parseBool("true")).isTrue();
        assertThat(MismoCoerce.parseBool("TRUE")).isTrue();
        assertThat(MismoCoerce.parseBool("yes")).isTrue();
        assertThat(MismoCoerce.parseBool("Y")).isTrue();
        assertThat(MismoCoerce.parseBool("1")).isTrue();
    }

    @Test
    void parseBool_acceptsManyFalsyForms() {
        assertThat(MismoCoerce.parseBool("false")).isFalse();
        assertThat(MismoCoerce.parseBool("no")).isFalse();
        assertThat(MismoCoerce.parseBool("N")).isFalse();
        assertThat(MismoCoerce.parseBool("0")).isFalse();
    }

    @Test
    void parseBool_returnsNullForUnknownAndBlank() {
        assertThat(MismoCoerce.parseBool(null)).isNull();
        assertThat(MismoCoerce.parseBool("")).isNull();
        assertThat(MismoCoerce.parseBool("maybe")).isNull();
    }

    @Test
    void firstNonNull_skipsNullAndBlank() {
        assertThat(MismoCoerce.firstNonNull(null, "", "  ", "third")).isEqualTo("third");
        assertThat(MismoCoerce.firstNonNull("first", "second")).isEqualTo("first");
        assertThat(MismoCoerce.firstNonNull(null, null)).isNull();
        assertThat(MismoCoerce.firstNonNull()).isNull();
    }

    @Test
    void normalizePhone_canonicalizesTenDigitInput() {
        assertThat(MismoCoerce.normalizePhone("5551234567")).isEqualTo("555-123-4567");
        assertThat(MismoCoerce.normalizePhone("(555) 123-4567")).isEqualTo("555-123-4567");
        assertThat(MismoCoerce.normalizePhone("555.123.4567")).isEqualTo("555-123-4567");
    }

    @Test
    void normalizePhone_dropsLeadingUSCountryCode() {
        assertThat(MismoCoerce.normalizePhone("15551234567")).isEqualTo("555-123-4567");
        assertThat(MismoCoerce.normalizePhone("1-555-123-4567")).isEqualTo("555-123-4567");
    }

    @Test
    void normalizePhone_passesThroughCanonicalAndOddInput() {
        assertThat(MismoCoerce.normalizePhone("555-123-4567")).isEqualTo("555-123-4567");
        // Non-US-shaped input is returned unchanged so the validator can complain visibly
        assertThat(MismoCoerce.normalizePhone("ext only")).isEqualTo("ext only");
        assertThat(MismoCoerce.normalizePhone(null)).isNull();
        assertThat(MismoCoerce.normalizePhone("  ")).isNull();
    }

    @Test
    void normalizeAssetType_passesThroughEntityForms() {
        for (String s : new String[]{
                "Checking", "Savings", "MoneyMarket", "CertificateOfDeposit",
                "MutualFunds", "Stocks", "Bonds", "Retirement401k",
                "IRA", "Pension", "EarnestMoney", "Other",
        }) {
            assertThat(MismoCoerce.normalizeAssetType(s)).isEqualTo(s);
        }
    }

    @Test
    void normalizeAssetType_mapsMismoLongFormsToShort() {
        assertThat(MismoCoerce.normalizeAssetType("CheckingAccount")).isEqualTo("Checking");
        assertThat(MismoCoerce.normalizeAssetType("SavingsAccount")).isEqualTo("Savings");
        assertThat(MismoCoerce.normalizeAssetType("MoneyMarketFund")).isEqualTo("MoneyMarket");
        assertThat(MismoCoerce.normalizeAssetType("MutualFund")).isEqualTo("MutualFunds");
        assertThat(MismoCoerce.normalizeAssetType("Stock")).isEqualTo("Stocks");
        assertThat(MismoCoerce.normalizeAssetType("Bond")).isEqualTo("Bonds");
        assertThat(MismoCoerce.normalizeAssetType("RetirementFund")).isEqualTo("Retirement401k");
        assertThat(MismoCoerce.normalizeAssetType("IndividualRetirementAccount")).isEqualTo("IRA");
        assertThat(MismoCoerce.normalizeAssetType("EarnestMoneyDeposit")).isEqualTo("EarnestMoney");
        assertThat(MismoCoerce.normalizeAssetType("EarnestMoneyCashDeposit")).isEqualTo("EarnestMoney");
    }

    @Test
    void normalizeAssetType_unknownAndBlankFallToOther() {
        assertThat(MismoCoerce.normalizeAssetType(null)).isEqualTo("Other");
        assertThat(MismoCoerce.normalizeAssetType("")).isEqualTo("Other");
        assertThat(MismoCoerce.normalizeAssetType("Cryptocurrency")).isEqualTo("Other");
    }

    @Test
    void normalizeZip_canonicalizesNineDigitsToZipPlusFour() {
        assertThat(MismoCoerce.normalizeZip("123456789")).isEqualTo("12345-6789");
        assertThat(MismoCoerce.normalizeZip("12345")).isEqualTo("12345");
    }

    @Test
    void normalizeZip_passesThroughExistingFormatsAndOddInput() {
        assertThat(MismoCoerce.normalizeZip("12345-6789")).isEqualTo("12345-6789");
        assertThat(MismoCoerce.normalizeZip("AB123")).isEqualTo("AB123"); // non-US ZIPs left alone
        assertThat(MismoCoerce.normalizeZip(null)).isNull();
        assertThat(MismoCoerce.normalizeZip("  ")).isNull();
    }
}

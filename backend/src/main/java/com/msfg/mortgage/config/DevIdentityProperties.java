package com.msfg.mortgage.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Local-only dev identity forwarded to suite on the funnel hand-off. Bound from suite.dev.* config. */
@ConfigurationProperties(prefix = "suite.dev")
public class DevIdentityProperties {
    private String sub;
    private String roles = "Borrower";
    private String org;

    public DevIdentityProperties() {}
    public DevIdentityProperties(String sub, String roles, String org) {
        this.sub = sub; this.roles = roles; this.org = org;
    }
    public String getSub() { return sub; }
    public void setSub(String sub) { this.sub = sub; }
    public String getRoles() { return roles; }
    public void setRoles(String roles) { this.roles = roles; }
    public String getOrg() { return org; }
    public void setOrg(String org) { this.org = org; }
}

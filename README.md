# ThoughtSpot Object Embed — Trusted Auth

A Salesforce Lightning Web Component (LWC) that embeds ThoughtSpot analytics into any Lightning page using **Trusted Authentication** (cookieless JWT tokens). Supports Liveboards, Search, Saved Answers, Spotter (AI analyst), and the Full ThoughtSpot App — all configurable in Lightning App Builder with no code required.

---

## What's Included

| Metadata | Purpose |
|---|---|
| `lwc/tsObjectEmbedTrustedAuth` | The embed component — drop it onto any Lightning page |
| `classes/TSForSFUtils` | Apex: generates JWT tokens via Named Credential callout |
| `classes/ObjectFieldPickList` | Apex: powers the advanced filter field dropdown in App Builder |
| `namedCredentials/tsEmbedNamedCred` | Callout endpoint to ThoughtSpot token API |
| `externalCredentials/tsEmbedExtCred` | Secure storage for the trusted auth secret key |
| `permissionsets/TsEmbedPS` | Grants users access to the External Credential and Apex classes |
| `cspTrustedSites/ThoughtSpot` | Allows the ThoughtSpot domain through Salesforce CSP |
| `corsWhitelistOrigins/https_thoughtspot_cloud` | CORS for cross-origin iframe requests |
| `labels/CustomLabels` | `TsValidityTime` — JWT token validity in seconds (default: 300) |
| `staticresources/tsembedSpotter1492` | ThoughtSpot Visual Embed SDK v1.49.2 (bundled, no CDN dependency) |

---

## Prerequisites

- Salesforce CLI (`sf`) installed and authenticated to your target org
- A ThoughtSpot instance with **Trusted Authentication enabled**
- Your ThoughtSpot **trusted auth secret key** (Developer → Security Settings → Edit → scroll to bottom)

---

## ThoughtSpot Setup

Before deploying to Salesforce, configure your ThoughtSpot instance:

1. **Enable Trusted Authentication** — Developer → Security Settings → Edit → toggle on Trusted Auth, copy the secret key

2. **Add Salesforce to CSP Visual Embed Hosts** — add your Salesforce org URL:
   ```
   https://your-org.lightning.force.com
   ```

3. **Add Salesforce to CORS Whitelisted Domains** — add the same domain (without `https://`):
   ```
   your-org.lightning.force.com
   ```
   For Experience Cloud sites, add those domains as well.

---

## Salesforce Deployment

Deploy everything in one command — no ordering required. Salesforce resolves dependencies server-side:

```bash
sf project deploy start --source-dir force-app --target-org <your-org-alias>
```

> **Note:** The Salesforce SOAP API intermittently throws `Missing message metadata.transfer:Finalizing` during finalization. This is a known platform bug — just re-run the command. It typically succeeds within 2–3 attempts.

---

## Post-Deploy Manual Steps

These cannot be deployed via metadata and must be done manually in Salesforce Setup:

### 1. Set the Trusted Auth Secret Key

Navigate to **Setup → Named Credentials → External Credentials → `tsEmbedExtCred`**

Edit the Principal named `tsEmbedExtCred_Principal` and set the **Password** field to your ThoughtSpot trusted auth secret key.

### 2. Assign the Permission Set

Navigate to **Setup → Permission Sets → `TsEmbedPS`** → Manage Assignments → Add Assignments

Assign `TsEmbedPS` to every user who needs to see ThoughtSpot embeds. This grants access to the External Credential (so Apex can read the secret key) and to both Apex classes.

### 3. Add ThoughtSpot to Named Credential Allowed Endpoints (if required)

If your org enforces Remote Site Settings / CSP headers strictly, verify that `tsEmbedNamedCred` points to your ThoughtSpot cluster URL and that the CSP Trusted Site record (`ThoughtSpot`) is deployed with the correct URL.

---

## Using the Component

Drop **ThoughtSpot Object Trusted Auth** onto any Lightning page via App Builder. Configure the properties in the panel on the right.

### Always Required

| Property | Description |
|---|---|
| **Embed Type** | One of: `Liveboard`, `Search`, `Answer`, `Spotter`, `Full App` |
| **ThoughtSpot URL** | Full URL to your ThoughtSpot cluster, e.g. `https://myco.thoughtspot.cloud` |
| **ThoughtSpot Org ID** | Your ThoughtSpot org identifier — leave blank if not using multi-org |

---

### Liveboard

Embeds a full Liveboard or a single visualization from a Liveboard.

| Property | Description |
|---|---|
| **[Liveboard] Liveboard ID** | GUID of the Liveboard to embed |
| **[Liveboard] Tab ID** | Open to a specific tab — leave blank for the default tab |
| **[Liveboard] Viz ID** | Embed a single visualization instead of the full Liveboard — leave blank for the full board |
| **[Liveboard] Hide Header?** | Hides the Liveboard header bar |
| **[Liveboard] Show Title?** | Shows the Liveboard title in the header |
| **[Liveboard] Full Height?** | Expands the iframe to the full height of the Liveboard content |

---

### Search

Embeds an interactive ThoughtSpot search interface.

| Property | Description |
|---|---|
| **[Search] Data Source ID** | GUID of the Worksheet or Model to search against |

---

### Answer

Embeds a saved ThoughtSpot Answer (a named search result).

| Property | Description |
|---|---|
| **[Answer] Saved Answer ID** | GUID of the saved Answer to embed |

---

### Spotter

Embeds the Spotter AI conversational analyst.

| Property | Description |
|---|---|
| **[Spotter] Worksheet / Model ID** | GUID of the Worksheet or Model Spotter will query |
| **[Spotter] Hide data source selector?** | Completely hides the data source picker |
| **[Spotter] Disable data source selector?** | Grays out the data source picker (visible but non-interactive) |
| **[Spotter] Hide ThoughtSpot branding on response cards?** | Removes the ThoughtSpot logo from AI-generated response cards |
| **[Spotter] Response card label** | Custom label shown on AI response cards — leave blank for no label |
| **[Spotter] Enable file upload?** | Shows a file upload button in the Spotter chat input |

---

### Full App

Embeds the entire ThoughtSpot application.

| Property | Description |
|---|---|
| **[Full App] Landing Page** | Page to open on load: `Page.Home`, `Page.Liveboards`, `Page.Search`, `Page.Data`, `Page.Answers`, `Page.SpotIQ`, `Page.Monitor` |
| **[Full App] Hide Trending section?** | Hides Trending Liveboards and Answers from the home page |
| **[Full App] Hide Watchlist section?** | Hides the KPI Watchlist panel |
| **[Full App] Hide Favorites section?** | Hides the Favorites panel |
| **[Full App] Hide Library section?** | Hides the Library (Answers and Liveboards list) |
| **[Full App] Hide Search module?** | Hides the search bar module |
| **[Full App] Hide Learning section?** | Hides the Learning videos and resources panel |

> **Note:** The homepage module toggles require the ThoughtSpot V2/V3 home page experience (not the classic V1 layout).

---

## Runtime Filtering (Record Pages Only)

When the component is placed on a **Record Page**, you can filter ThoughtSpot content based on the current Salesforce record. Two modes are available:

### Simple Filter — filter by Record ID

Check **"Simple filter: filter content based on the current record"**, then set:

- **ThoughtSpot Column Name** — the column in your Liveboard or Answer to filter on (must match exactly)

The current Salesforce record ID is passed as the filter value.

### Advanced Filter — filter by any Salesforce field

Leave simple filter unchecked, then set:

- **Advanced filter: Salesforce field to use as filter value** — pick any field from the current record object (powered by a dynamic picklist)
- **ThoughtSpot Column Name** — the column in your Liveboard or Answer to filter on

The field's live value is fetched via `@wire(getRecord)` and passed as the filter value. This updates reactively if the record is edited.

> Filtering is only available on Record Pages. The `recordId` does not exist on App Pages or Home Pages.

---

## Row-Level Security via ABAC Variables (Advanced)

ThoughtSpot supports **Attribute-Based Access Control (ABAC)** through `variable_values` in the token request. This lets you enforce row-level security server-side — the ThoughtSpot data model applies filter rules based on values you inject at token generation time, so users can only see rows that match their attributes (e.g., their region, account tier, or department).

**This is different from runtime filters:**

| | Runtime Filters | ABAC / `variable_values` |
|---|---|---|
| Applied | Per embed, in the SDK config | At token generation, server-side |
| Enforced by | ThoughtSpot embed SDK | ThoughtSpot data model (RLS rules) |
| Users can bypass | Potentially (via SDK API) | No — enforced before data is returned |
| Requires ThoughtSpot setup | No | Yes — RLS rules must exist on the table |
| Implemented in this component | Yes | Not wired in by default |

**To add ABAC variable support**, make two changes:

**1. Pass variables in `TSForSFUtils.cls` → `httpGetTokenReq()`**

The `postData` map already flows through to the ThoughtSpot token API. Add your `variable_values` before the callout:

```apex
// Example: inject the current user's Division as an RLS variable
postData.put('variable_values', new List<Map<String, Object>>{
    new Map<String, Object>{
        'name'  => 'user_region',
        'value' => new List<String>{ userDivision }
    }
});
```

Fetch any Salesforce user attributes you need from the `getUserInfoByEmail()` query — it already returns `Division`, `Email`, `Username`, and `FederationIdentifier`.

**2. Pass those attributes from the LWC**

In `makePostRequest()` in the LWC JS, include the values in `postData` so Apex receives them:

```js
async makePostRequest() {
    const postData = {
        username:       this.userName,
        org_identifier: this.orgID,
        persist_option: 'NONE',
        auto_create:    false,
        // add RLS variables here, or fetch from a separate Apex call
    };
    const response = await this.makeCallout(postData);
    return response.token;
}
```

See [ThoughtSpot ABAC via RLS Variables docs](https://developers.thoughtspot.com/docs/abac-via-rls-variables) for the full `variable_values` schema and how to define RLS rules on your tables.

---

## Security Architecture

The trusted auth secret key never reaches the browser. Token generation is entirely server-side:

```
ThoughtSpot Secret Key
  → External Credential (tsEmbedExtCred — password field)
    → Named Credential (tsEmbedNamedCred)
      → Apex callout to /api/rest/2.0/auth/token/custom
        → JWT returned to the Visual Embed SDK
```

The SDK uses `AuthType.TrustedAuthTokenCookieless` with `autoLogin: true` — sessions silently re-authenticate on expiry without showing a login prompt.

Token validity defaults to **300 seconds** (5 minutes), controlled by the `TsValidityTime` custom label in Setup.

---

## SDK Version

**ThoughtSpot Visual Embed SDK v1.49.2** — bundled as a Salesforce Static Resource (`tsembedSpotter1492`). No CDN dependency at runtime; the SDK loads from Salesforce servers.

---

## Backwards Compatibility

If you have existing Lightning pages using the old **TS Object GUID** field, they will continue to work. The deprecated `[Deprecated] Object GUID` property is kept as a fallback in all embed type configurations. Migrate existing instances by filling in the appropriate type-specific ID field (e.g., `[Liveboard] Liveboard ID`) and clearing the deprecated field when convenient.

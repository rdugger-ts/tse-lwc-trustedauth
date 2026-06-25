///////////////////////////////////////
// ThoughtSpot Object Embed — Trusted Auth
//
// Purpose: Embed Liveboard, Search, Answer, Spotter, and Full App into Salesforce
//          using ThoughtSpot Trusted Authentication (cookieless JWT tokens).
//
// Setup steps:
//   1. ThoughtSpot: enable Trusted Auth, get secret key (Developer > Security Settings)
//   2. ThoughtSpot: add Salesforce domain to CORS Whitelisted Domains and CSP Visual Embed Hosts
//   3. Salesforce: deploy this package (sf project deploy start --source-dir force-app --target-org <alias>)
//   4. Salesforce: set the External Credential (tsEmbedExtCred) password to your ThoughtSpot secret key
//   5. Salesforce: assign the TsEmbedPS permission set to all users who need access
//   6. Salesforce: drop this component onto any Lightning page via the App Builder
//
// Filtering (Record Pages only):
//   Simple  — check "Filter content based on the current record", set ThoughtSpot Column Name
//   Advanced — select a Salesforce field from the dropdown, set ThoughtSpot Column Name
//
// SDK: ThoughtSpot Visual Embed SDK v1.49.2 (tsembedSpotter1492 static resource)
// Auth: TrustedAuthTokenCookieless — tokens generated server-side via Apex + Named Credential
///////////////////////////////////////

import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import thoughtSpotSDK from '@salesforce/resourceUrl/tsembedSpotter1492';
import httpGetTokenReq from '@salesforce/apex/TSForSFUtils.httpGetTokenReq';
import getUserInfoByEmail from '@salesforce/apex/TSForSFUtils.getUserInfoByEmail';
import { loadScript } from 'lightning/platformResourceLoader';

export default class TsObjectEmbedTrustedAuth extends LightningElement {

    @api objectApiName; /** Object API name - automatically passed when in a record page */
    @api recordId;      /** Object record ID - automatically passed when in a record page */

    @api embedType;

    // Per-embed-type object identifiers (shown/hidden in App Builder via showAsCondition)
    @api liveboardId;      /** Liveboard GUID */
    @api searchDataSource; /** Worksheet / Model GUID for Search */
    @api answerId;         /** Saved Answer GUID */
    @api worksheetId;               /** Worksheet / Model GUID for Spotter */
    @api spotterHideCardBranding;   /** Spotter: hide TS logo on AI response cards */
    @api spotterCardBrandingLabel;  /** Spotter: label shown on AI response cards */
    @api spotterFileUpload;         /** Spotter: enable file upload in chat input */
    @api spotterHideSourceSelection;    /** Spotter: hide data source selector entirely */
    @api spotterDisableSourceSelection; /** Spotter: gray out data source selector (keeps it visible) */
    @api fullAppPageId;             /** Landing page for Full App embed */
    @api hideModuleTrending;     /** Full App: hide Trending section */
    @api hideModuleWatchlist;    /** Full App: hide Watchlist section */
    @api hideModuleFavorite;     /** Full App: hide Favorites section */
    @api hideModuleMyLibrary;    /** Full App: hide Library section */
    @api hideModuleSearch;       /** Full App: hide Search module */
    @api hideModuleLearning;     /** Full App: hide Learning section */
    @api tsObjectGuid;     /** @deprecated — use the type-specific ID fields above */

    @api tsObjectTabid;
    @api vizId;
    @api orgID;
    @api tsURL;
    @api hideLiveboardHeader;
    @api showLiveboardTitle;
    @api fullHeight;

    // Filtering
    @api filterOnRecordId; /** Simple mode: pass recordId directly as a runtime filter value */
    @api tsColumnName;     /** ThoughtSpot column name to filter on (used in both simple and advanced mode) */
    @api sfFieldName;      /** Advanced mode: Salesforce field whose value is passed as the filter value */

    sfFieldValue;    /** Populated by the wire adapter when sfFieldName is configured */
    userInfoReady = false; /** True once getUserInfoByEmail() has resolved */
    sdkLoaded = false;     /** Guards against loadTSSDK() being called twice */

    /** Reactively fetches the configured Salesforce field value from the current record.
     *  In advanced filter mode, this drives SDK initialization to guarantee sfFieldValue
     *  is available before buildRuntimeFilters() is called. */
    @wire(getRecord, { recordId: '$recordId', fields: '$sfFieldName' })
    wiredRecord({ error, data }) {
        if (data) {
            this.sfFieldValue = getFieldValue(data, this.sfFieldName);
            // Advanced filter mode: load SDK now that we have the field value.
            // If user info hasn't resolved yet, the connectedCallback .then() will catch it.
            if (this.userInfoReady) {
                this.loadTSSDK();
            }
        } else if (error) {
            console.error('Failed to retrieve record field:', error);
        }
    }

    async connectedCallback() {
        getUserInfoByEmail()
            .then(data => {
                this.userName = data.Username;
                this.userInfoReady = true;

                if (!this.sfFieldName) {
                    // Simple or no-filter mode — render immediately.
                    this.loadTSSDK();
                } else if (this.sfFieldValue != null) {
                    // Advanced mode and wire already resolved before Apex finished.
                    this.loadTSSDK();
                }
                // Otherwise advanced mode is waiting — wiredRecord() will call loadTSSDK()
                // once the field value arrives.
            });
    }

    loadTSSDK() {
        if (this.sdkLoaded) return;
        this.sdkLoaded = true;
        loadScript(this, thoughtSpotSDK)
            .then(() => {
                this.initSDKEmbed();
            })
            .catch(error => {
                this.handleError(error);
            });
    }

    initSDKEmbed() {
        const containerDiv = this.template.querySelector('div.thoughtspotObject');

        try {
            this.embedInit = tsembed.init({
                thoughtSpotHost: this.tsURL,
                authType: tsembed.AuthType.TrustedAuthTokenCookieless,
                autoLogin: true,
                getAuthToken: () => this.makePostRequest(),
                customizations: {
                    iconSpriteUrl: 'https://cdn.jsdelivr.net/gh/thoughtspot/custom-css-demo/alternate-spotter-icon.svg',
                    style: {
                        customCSS: {
                            variables: {
                                // Page & panel backgrounds
                                '--ts-var-root-background':                     '#F5F8FC',
                                '--ts-var-spotter-prompt-background':           '#EBF2FA',
                                '--ts-var-spotter-input-background':            '#FFFFFF',
                                // Typography
                                '--ts-var-root-color':                          '#1A1A1A',
                                // Buttons
                                '--ts-var-button--primary-background':          '#0A2E5C',
                                '--ts-var-button--primary-color':               '#FFFFFF',
                                '--ts-var-button--secondary-background':        '#EBF2FA',
                                '--ts-var-button--secondary-color':             '#0A2E5C',
                                '--ts-var-button--secondary--hover-background': '#C2D5EA',
                                // Viz / chart cards
                                '--ts-var-viz-background':                      '#FFFFFF',
                                '--ts-var-viz-border-radius':                   '8px',
                                '--ts-var-viz-title-color':                     '#0A2E5C',
                                '--ts-var-viz-description-color':               '#3A5A80',
                                // Nav bar inside iframe
                                '--ts-var-nav-background':                      '#0A2E5C',
                                '--ts-var-nav-color':                           '#FFFFFF',
                            },
                        },
                    },
                    content: {
                        strings: {
                            'Spotter':     'MyCo Analytics',
                            'ThoughtSpot': 'MyCo Analytics',
                            "Let's make sense of your data together": 'Ask me anything about your data',
                        },
                        stringIDs: {
                            'spotter.newChatPrompt.landingPage.title': "Hi, I’m MyCo Analytics, your AI data analyst!",
                        },
                    },
                },
            });

            const embedMap = {
                'Liveboard': [tsembed.LiveboardEmbed, this.getLiveboardConfig()],
                'Search':    [tsembed.SearchEmbed,    this.getSearchConfig()],
                'Answer':    [tsembed.SearchEmbed,    this.getAnswerConfig()],
                'Spotter':   [tsembed.SpotterEmbed,   this.getSpotterConfig()],
                'Full App':  [tsembed.AppEmbed,       this.getFullAppConfig()],
            };

            const entry = embedMap[this.embedType];
            if (!entry) {
                console.error('Unknown embed type:', this.embedType);
                return;
            }
            const [EmbedClass, config] = entry;
            this.embedObj = new EmbedClass(containerDiv, config);
            this.embedObj.render();

            }
            catch (error) {
                console.error('Error:', error);
            }
    }

    getLiveboardConfig() {
        return {
            frameParams: {},
            fullHeight: this.fullHeight,
            hideLiveboardHeader: this.hideLiveboardHeader,
            showLiveboardTitle: this.showLiveboardTitle,
            showLiveboardDescription: false,
            showPreviewLoader: true,
            isLiveboardHeaderSticky: false,
            isLiveboardMasterpiecesEnabled: true,
            liveboardId: this.liveboardId || this.tsObjectGuid,
            activeTabId: this.tsObjectTabid,
            ...(this.vizId && { vizId: this.vizId }),
            runtimeFilters: this.buildRuntimeFilters(),
        };
    }

    getSearchConfig() {
        return {
            frameParams: { height: 800 },
            fullHeight: true,
            collapseDataSources: false,
            hideDataSources: false,
            dataSource: this.searchDataSource || this.tsObjectGuid,
            runtimeFilters: this.buildRuntimeFilters(),
        };
    }

    getAnswerConfig() {
        return {
            frameParams: { height: 800 },
            fullHeight: true,
            answerId: this.answerId || this.tsObjectGuid,
            runtimeFilters: this.buildRuntimeFilters(),
        };
    }

    getSpotterConfig() {
        return {
            frameParams: { height: 800 },
            worksheetId: this.worksheetId || this.tsObjectGuid,
            doNotTrackPreRenderSize: true,
            updatedSpotterChatPrompt: true,
            hideSourceSelection: this.spotterHideSourceSelection || false,
            disableSourceSelection: this.spotterDisableSourceSelection || false,
            searchOptions: {
                searchQuery: '',
            },
            spotterChatConfig: {
                hideToolResponseCardBranding: this.spotterHideCardBranding || false,
                toolResponseCardBrandingLabel: this.spotterCardBrandingLabel || '',
                spotterFileUploadEnabled: this.spotterFileUpload || false,
            },
        };
    }

    getFullAppConfig() {
        const hiddenModules = [
            this.hideModuleTrending  && tsembed.HomepageModule.Trending,
            this.hideModuleWatchlist && tsembed.HomepageModule.Watchlist,
            this.hideModuleFavorite  && tsembed.HomepageModule.Favorite,
            this.hideModuleMyLibrary && tsembed.HomepageModule.MyLibrary,
            this.hideModuleSearch    && tsembed.HomepageModule.Search,
            this.hideModuleLearning  && tsembed.HomepageModule.Learning,
        ].filter(Boolean);

        return {
            frameParams: { height: 800 },
            pageId: this.fullAppPageId || 'Page.Home',
            ...(hiddenModules.length > 0 && { hiddenHomepageModules: hiddenModules }),
        };
    }

    async makePostRequest() {
        const postData = {
            username: this.userName,
            org_identifier: this.orgID,
            persist_option: 'NONE',
            auto_create: false,
        };
        const response = await this.makeCallout(postData);
        return response.token;
    }

    buildRuntimeFilters() {
        // runtimeFilters let you filter ThoughtSpot content based on Salesforce record context.
        // The columnName must match an existing column in your ThoughtSpot Liveboard or Answer.
        // Docs: https://developers.thoughtspot.com/docs/runtime-filters
        //
        // Simple mode: filterOnRecordId passes the current Salesforce record ID as the filter value.
        // Set tsColumnName to the ThoughtSpot column name you want to filter on (e.g. 'Account Id').
        if (this.filterOnRecordId && this.recordId && this.tsColumnName) {
            return [{ columnName: this.tsColumnName, operator: 'EQ', values: [this.recordId] }];
        }

        // Advanced mode: sfFieldName selects a specific Salesforce field (e.g. Account.Industry).
        // Its value is fetched via the wire adapter and used as the filter value.
        if (this.sfFieldName && this.tsColumnName && this.sfFieldValue != null) {
            return [{ columnName: this.tsColumnName, operator: 'EQ', values: [String(this.sfFieldValue)] }];
        }

        return [];
    }

    handleError(error) {
        console.error('Error loading TS library:', error.message || error);
    }

    async makeCallout(postData) {
        const result = await httpGetTokenReq({ postData });
        return JSON.parse(result);
    }
}

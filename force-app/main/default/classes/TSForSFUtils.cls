public with sharing class TSForSFUtils {
    @AuraEnabled(cacheable=true)
    public static User getUserInfoByEmail() {
        try {
            String userName = UserInfo.getUserName();

            User userInfo = [ SELECT Division, Email, Username, FirstName, LastName, FederationIdentifier                              
                              FROM User 
                              WHERE Username = :userName
                              AND alias != 'guest'
                              LIMIT 1 ];
            return userInfo;
        } catch (Exception e) {
            // Handling any exceptions or errors
            System.debug('Error occurred while retrieving user information from getUserInfoByEmail: ' + e.getMessage());
            return null;
        }
    }

    @AuraEnabled(cacheable=false)
    public static String httpGetTokenReq(Map<String, Object> postData) {
        postData.put('secret_key', '{!$Credential.tsEmbedExtCred.password}');
        postData.put('validity_time_in_sec', System.Label.TsValidityTime);

        String jsonBody = JSON.serialize(postData);

        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint('callout:tsEmbedNamedCred');
        request.setMethod('POST');
        request.setHeader('Content-Type', 'application/json');
        request.setHeader('Accept', 'application/json');
        request.setBody(jsonBody);
        HttpResponse response = http.send(request);
        return response.getBody();
    }
}
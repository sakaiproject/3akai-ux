/*!
 * Copyright 2014 Apereo Foundation (AF) Licensed under the
 * Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://opensource.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

casper.test.begin('Widget - Create collab doc', function(test) {

    /**
     * Open the create collab doc modal with assertions
     */
    var openCreateCollabDoc = function() {
        // Wait till the widget loading mechanisme is ready
        // Do this by waiting till a template has been rendered
        casper.waitForSelector('#me-clip-container .oae-clip', function() {
            casper.waitForSelector('.oae-clip-secondary .oae-clip-content > button', function() {
                casper.click('.oae-clip-secondary .oae-clip-content > button');
                test.assertExists('.oae-trigger-createcollabdoc', 'Create collab doc trigger exists');
                casper.click('.oae-trigger-createcollabdoc');
                casper.waitForSelector('.setpermissions-summary', function() {
                    test.assertVisible('#createcollabdoc-modal', 'Create collab doc pane is showing after trigger');
                    casper.click('.oae-clip-secondary .oae-clip-content > button');
                });
            });
        });
    };

    /**
     * Goes through the workflow of creating a collaborative document
     */
    var verifyCreateCollabDoc = function(user2Id) {
        casper.waitForSelector('form#createcollabdoc-form', function() {
            // Verify the form is present
            test.assertExists('form#createcollabdoc-form', 'The create collab doc form is present');
            test.assertExists('#createcollabdoc-name', 'The collab doc name field is present');
            // Fill the form
            casper.fill('form#createcollabdoc-form', {
                'createcollabdoc-name': 'CasperJS test document'
            }, false);
            // Verify the change permissions button is there
            test.assertExists('.setpermissions-change-permissions', 'The \'change permissions\' button is present');
            // Click the change permissions button
            casper.click('.setpermissions-change-permissions');
            // Verify the permissions radio button group and share input fields are there
            test.assertExists('#createcollabdoc-permissions-container #setpermissions-container input[type="radio"]', 'The \'change permissions\' radio button group is present');
            test.assertExists('#createcollabdoc-permissions-container .as-selections input', 'The \'share\' input field is present');
            // Select the public permission
            casper.click('#createcollabdoc-permissions-container #setpermissions-container input[type="radio"][value="public"]', 'Select \'public\' permissions for the collab doc');
            // Verify the update button is present
            test.assertExists('#setpermissions-savepermissions', 'The \'Update\' button is present');
            // Share it with the second user that was created for the test
            casper.thenEvaluate(function(user2Id) {
                document.querySelector('#createcollabdoc-permissions-container .as-selections input').value = user2Id;
            }, user2Id);
            // Click the input field to trigger the list
            casper.click('#createcollabdoc-permissions-container .as-selections input');
            casper.waitForSelector('.as-list li', function() {
                // Verify there is at least one item in the autosuggestions
                test.assertExists('.as-list li', 'At least one suggestion for \'' + user2Id + '\' was returned from the server');
                // Click the first suggestion in the list
                casper.click('.as-list li');
                // Click the update button
                casper.click('#setpermissions-savepermissions', 'Update the permission changes');

                // Verify the 'create document' button is present
                test.assertExists('#createcollabdoc-create', 'The \'Create document\' button is present');
                // Click the submit button
                casper.click('#createcollabdoc-create');
                // Wait for a second and verify that the user was redirected to the content profile page of the collab doc
                casper.wait(configUtil.searchWaitTime, function() {
                    test.assertVisible('#content-clip-container', 'Content profile is shown after creation of collab doc');
                    test.assertSelectorHasText('#content-clip-container h1', 'CasperJS test document', 'Title matches \'CasperJS test document\'');
                });
            });
        });
    };

    /**
     * Verify the form validation by checking the following:
     *     - Try submitting a form without putting in a title
     */
    var verifyCreateCollabDocValidation = function() {
        casper.waitForSelector('form#createcollabdoc-form', function() {
            // Fill the form
            casper.fill('form#createcollabdoc-form', {
                'createcollabdoc-name': ''
            }, false);
            // Click the submit button
            casper.click('#createcollabdoc-create');
            // Verify that an error label is shown
            test.assertExists('#createcollabdoc-name-error', 'Create collabdoc form successfully validated empty form');
        });
    };

    casper.start(configUtil.tenantUI, function() {
        // Create a couple of users to test createcollabdoc with
        userUtil.createUsers(2, function(user1, user2) {
            // Login with first user
            userUtil.doLogIn(user1.username, user1.password);
            uiUtil.openMe();

            // Open the createcollabdoc modal
            casper.then(function() {
                casper.echo('# Verify open create collab doc modal', 'INFO');
                openCreateCollabDoc();
            });

            // Create a collabdoc
            casper.then(function() {
                casper.echo('# Verify create collab doc', 'INFO');
                verifyCreateCollabDoc(user2.username);
            });

            uiUtil.openMe();

            // Verify the collab doc form validation
            casper.then(function() {
                casper.echo('# Verify create collab doc validation', 'INFO');
                casper.then(openCreateCollabDoc);
                casper.then(verifyCreateCollabDocValidation);
            });

            // Log out at the end of the test
            userUtil.doLogOut();
        });
    });

    casper.run(function() {
        test.done();
    });
});

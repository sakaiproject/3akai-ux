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

casper.test.begin('Widget - Edit content', function(test) {

    /**
     * Open the edit content modal with assertions
     */
    var openEditContentModal = function() {
        casper.waitForSelector('#content-clip-container .oae-clip-content > button', function() {
            casper.click('#content-clip-container .oae-clip-content > button');
            casper.waitForSelector('button.oae-trigger-editcontent', function() {
                test.assertExists('button.oae-trigger-editcontent', 'The edit content trigger is present');
                casper.click('button.oae-trigger-editcontent');
                casper.waitUntilVisible('#editcontent-modal', function() {
                    test.assertVisible('#editcontent-modal', 'The edit content pane is showing after trigger');
                    casper.click('#content-clip-container .oae-clip-content > button');
                });
            });
        });
    };

    /**
     * Verify that the edit content elements are present
     */
    var verifyEditContentElements = function() {
        test.assertExists('#editcontent-modal #editcontent-form', 'Verify that the edit content form is present');
        test.assertExists('#editcontent-modal #editcontent-form input#editcontent-name', 'Verify that the content name field is present');
        test.assertExists('#editcontent-modal #editcontent-form textarea#editcontent-description', 'Verify that the content description field is present');
        test.assertExists('#editcontent-modal #editcontent-form button[data-dismiss="modal"]', 'Verify that the content cancel button present');
        test.assertExists('#editcontent-modal #editcontent-form button[type="submit"]', 'Verify that the content `Edit content` button present');
    };

    /**
     * Verify the form validation when editing content
     */
    var verifyEditContentFormValidation = function() {
        // Try submitting an empty form
        casper.fill('#editcontent-modal #editcontent-form', {
            'editcontent-name': '',
            'editcontent-description': ''
        }, false);
        casper.click('#editcontent-modal #editcontent-form button[type="submit"]');
        test.assertExists('#editcontent-modal #editcontent-form #editcontent-name-error', 'Empty form content name is properly validated');
        test.assertDoesntExist('#editcontent-modal #editcontent-form #editcontent-description-error', 'Empty form description is properly validated');

        // Try submitting a form with only a description
        casper.fill('#editcontent-modal #editcontent-form', {
            'editcontent-name': '',
            'editcontent-description': 'Description'
        }, false);
        casper.click('#editcontent-modal #editcontent-form button[type="submit"]');
        test.assertExists('#editcontent-modal #editcontent-form #editcontent-name-error', 'Form content name is properly validated when only submitting a description');
        test.assertDoesntExist('#editcontent-modal #editcontent-form #editcontent-description-error', 'Empty form content description is properly validated when only submitting a description');

        // Try submitting spaces only
        casper.fill('#editcontent-modal #editcontent-form', {
            'editcontent-name': '       ',
            'editcontent-description': '       '
        }, false);
        casper.click('#editcontent-modal #editcontent-form button[type="submit"]');
        test.assertExists('#editcontent-modal #editcontent-form #editcontent-name-error', 'Form content name is properly validated when only submitting spaces');
        test.assertDoesntExist('#editcontent-modal #editcontent-form #editcontent-description-error', 'Empty form content description is properly validated when only submitting spaces');
    };

    /**
     * Verify that content can be edited
     */
    var verifyEditContent = function() {
        // Try submitting an empty form
        casper.fill('#editcontent-modal #editcontent-form', {
            'editcontent-name': 'New content name',
            'editcontent-description': 'Content description'
        }, false);
        casper.click('#editcontent-modal #editcontent-form button[type="submit"]');
        // Verify that the content was edited
        casper.waitForSelector('#oae-notification-container .alert', function() {
            test.assertDoesntExist('#oae-notification-container .alert.alert-error', 'Verify that editing content succeeds');
            test.assertSelectorHasText('#content-clip-container h1', 'New content name', 'The content was successfully renamed to \'New content name\'');
            casper.click('#oae-notification-container .close');
        });
    };

    casper.start(configUtil.tenantUI, function() {
        // Create a user to test with
        userUtil.createUsers(1, function(user1) {
            // Login with that user
            userUtil.doLogIn(user1.username, user1.password);

            contentUtil.createLink(null, null, null, null, null, null, null, function(err, linkProfile) {
                uiUtil.openLinkProfile(linkProfile);

                casper.then(function() {
                    casper.echo('# Verify open edit content modal', 'INFO');
                    openEditContentModal();
                });

                casper.then(function() {
                    casper.echo('# Verify edit content elements', 'INFO');
                    verifyEditContentElements();
                });

                casper.then(function() {
                    casper.echo('# Verify edit content form validation', 'INFO');
                    verifyEditContentFormValidation();
                });

                casper.then(function() {
                    casper.echo('# Verify content can be edited', 'INFO');
                    verifyEditContent();
                });

                // Log out at the end of the test
                userUtil.doLogOut();
            });
        });
    });

    casper.run(function() {
        test.done();
    });
});

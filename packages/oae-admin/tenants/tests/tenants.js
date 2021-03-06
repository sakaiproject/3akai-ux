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

casper.test.begin('Widget - Tenants', function(test) {

    /**
     * Verify that a tenant can be started
     *
     * @param  {String}    tenantID    The ID of the tenant to be started
     */
    var verifyStartTenant = function(tenantID) {
        casper.waitForSelector('.tenants-start[data-alias="' + tenantID + '"]', function() {
            test.assertExists('.tenants-start[data-alias="' + tenantID + '"]', 'The \'Start\' button is present');
            casper.click('.tenants-start[data-alias="' + tenantID + '"]');

            // Wait for the confirmation modal to show
            casper.waitForSelector('#confirmdialog-modal.in', function() {
                test.assertExists('#confirmdialog-modal.in', 'A confirmation modal shows to confirm stopping the tenant');
                // Confirm starting the tenant
                test.assertExists('#confirmdialog-confirm', 'The \'Yes, start "' + tenantID + '"\' button is present');
                casper.click('#confirmdialog-confirm');
                casper.waitForSelector('#oae-notification-container .alert', function() {
                    test.assertDoesntExist('#oae-notification-container .alert.alert-error', 'Tenant ' + tenantID + ' was successfully started');
                    casper.click('#oae-notification-container .close');
                });
            });
        });
    };

    /**
     * Verify that a tenant can be stopped
     *
     * @param  {String}    tenantID    The ID of the tenant to be stopped
     */
    var verifyStopTenant = function(tenantID) {
        casper.waitForSelector('.tenants-stop[data-alias="' + tenantID + '"]', function() {
            test.assertExists('.tenants-stop[data-alias="' + tenantID + '"]', 'The \'Stop\' button is present');
            casper.click('.tenants-stop[data-alias="' + tenantID + '"]');

            // Wait for the confirmation modal to show
            casper.waitForSelector('#confirmdialog-modal.in', function() {
                test.assertExists('#confirmdialog-modal.in', 'A confirmation modal shows to confirm stopping the tenant');
                // Confirm stopping the tenant
                test.assertExists('#confirmdialog-confirm', 'The \'Yes, stop "' + tenantID + '"\' button is present');
                casper.click('#confirmdialog-confirm');
                casper.waitForSelector('#oae-notification-container .alert', function() {
                    test.assertDoesntExist('#oae-notification-container .alert.alert-error', 'Tenant ' + tenantID + ' was successfully stopped');
                    casper.click('#oae-notification-container .close');
                });
            });
        });
    };

    /**
     * Verifies that a tenant can be renamed
     *
     * @param  {String}    tenantID    The ID of the tenant to be renamed
     */
    var verifyRenameTenant = function(tenantID) {
        casper.waitForSelector('.jeditable-container .jeditable-field[data-field="displayName"][data-alias="' + tenantID + '"]', function() {
            test.assertExists('.jeditable-container .jeditable-field[data-field="displayName"][data-alias="' + tenantID + '"]', 'The editable tenant name field is present');
            casper.click('.jeditable-container .jeditable-field[data-field="displayName"][data-alias="' + tenantID + '"]');
            // Submit the form
            test.assertExists('.jeditable-container .jeditable-field[data-field="displayName"][data-alias="' + tenantID + '"] form', 'The tenant name form is present after click');
            casper.fill('.jeditable-container .jeditable-field[data-field="displayName"][data-alias="' + tenantID + '"] form', {
                'value': 'New tenant name'
            }, false);
            casper.click('html');
            casper.waitForSelector('.jeditable-container .jeditable-field[data-field="displayName"][data-alias="' + tenantID + '"]', function() {
                test.assertSelectorHasText('.jeditable-container .jeditable-field[data-field="displayName"][data-alias="' + tenantID + '"]', 'New tenant name', 'The tenant name has been successfully changed');
            });
        });
    };

    /**
     * Verifies that a new tenant can be created and returns the ID of the new tenant in the callback.
     *
     * @param  {Function}   callback            Standard callback function executed when the test is complete
     * @param  {String}     callback.tenantID   The ID of the created tenant
     */
    var verifyCreateNewTenant = function(callback) {
        var tenantID = mainUtil.generateRandomString();
        test.assertExists('form#tenants-create-form', 'The create tenant form is present');
        // Try submitting an empty form
        casper.fill('form#tenants-create-form', {
            'alias': tenantID,
            'displayName': tenantID + ' Tenant',
            'host': tenantID + '.oae.com'
        }, false);
        // Submit the form
        casper.click('#tenants-create-submit-button');
        // Verify that creating the tenant worked
        casper.waitForSelector('#oae-notification-container .alert', function() {
            test.assertDoesntExist('#oae-notification-container .alert.alert-error', 'New tenant ' + tenantID + ' successfully created');
            casper.click('#oae-notification-container .close');
            callback(tenantID.toLowerCase());
        });
    };

    /**
     * Verify the create tenant validation by checking the following:
     *     - Try submitting an empty form
     *     - Try submitting a form without alias
     *     - Try submitting a form without name
     *     - Try submitting a form without host
     */
    var verifyCreateTenantValidation = function() {
        casper.waitForSelector('#tenants-create-form', function() {
            // Toggle the create tenant form
            test.assertExists('#tenants-container .admin-table-striped-toggle', 'The create tenant toggle is present');
            casper.click('#tenants-container .admin-table-striped-toggle');

            // Try submitting an empty form
            casper.fill('form#tenants-create-form', {
                'alias': '',
                'displayName': '',
                'host': ''
            }, false);
            // Submit the form
            casper.click('#tenants-create-submit-button');
            // Verify that an error label is shown
            test.assertExists('#alias-error', 'Create tenant form successfully validated empty form - alias');
            test.assertExists('#displayName-error', 'Create tenant form successfully validated empty form - displayName');
            test.assertExists('#host-error', 'Create tenant form successfully validated empty form - host');

            // Try submitting a form without alias
            casper.fill('form#tenants-create-form', {
                'alias': '',
                'displayName': 'CasperJS',
                'host': configUtil.tenantHost
            }, false);
            // Submit the form
            casper.click('#tenants-create-submit-button');
            // Verify that an error label is shown
            test.assertExists('#alias-error', 'Create tenant form successfully validated form with missing alias');

            // Try submitting a form without name
            casper.fill('form#tenants-create-form', {
                'alias': 'test',
                'displayName': '',
                'host': configUtil.tenantHost
            }, false);
            // Submit the form
            casper.click('#tenants-create-submit-button');
            // Verify that an error label is shown
            test.assertExists('#displayName-error', 'Create tenant form successfully validated form with missing displayName');

            // Try submitting a form without host
            casper.fill('form#tenants-create-form', {
                'alias': 'test',
                'displayName': 'CasperJS',
                'host': ''
            }, false);
            // Submit the form
            casper.click('#tenants-create-submit-button');
            // Verify that an error label is shown
            test.assertExists('#host-error', 'Create tenant form successfully validated form with missing host');
        });
    };

    casper.start(configUtil.adminUI, function() {
        // Log in with admin user
        userUtil.doLogIn(configUtil.adminUsername, configUtil.adminPassword);
        uiUtil.openAdmin();

        // Verify form validation
        casper.echo('# Verify the create tenant form validation', 'INFO');
        casper.then(verifyCreateTenantValidation);

        casper.then(function() {
            // Create a new tenant
            casper.echo('# Verify creating a new tenant', 'INFO');
            verifyCreateNewTenant(function(tenantID) {
                // Rename the new tenant
                casper.then(function() {
                    casper.echo('# Verify renaming a tenant', 'INFO');
                    verifyRenameTenant(tenantID);
                });

                // Stop the new tenant
                casper.then(function() {
                    casper.echo('# Verify stopping a tenant', 'INFO');
                    verifyStopTenant(tenantID);
                });

                // Start the new tenant
                casper.then(function() {
                    casper.echo('# Verify starting a tenant', 'INFO');
                    verifyStartTenant(tenantID);
                });
            });
        });

        // Log out with admin user
        userUtil.doLogOut();
    });

    casper.run(function() {
        test.done();
    });
});

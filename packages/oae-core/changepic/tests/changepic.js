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

casper.test.begin('Widget - Change picture', function(test) {

    /**
     * Open the change picture modal with assertions
     */
    var openChangePicture = function() {
        casper.waitForSelector('#me-clip-container .oae-clip-content > button', function() {
            casper.click('#me-clip-container .oae-clip-content > button');
            test.assertExists('.oae-trigger-changepic', 'Change picture trigger exists');
            casper.click('.oae-trigger-changepic');
            casper.waitUntilVisible('#changepic-modal', function() {
                test.assertVisible('#changepic-modal', 'Change picture pane is showing after trigger');
                casper.click('#me-clip-container .oae-clip-content > button');
            });
        });
    };

    /**
     * Goes through the workflow of uploading and saving the user picture
     */
    var verifyPictureUpload = function() {
        // Verify the upload form is present
        test.assertExists('form#changepic-form', 'The change picture form is present');
        // Verify the no-image placeholder is present
        test.assertSelectorHasText('.changepic-dropzone-content small', 'Drag a photo here to upload', 'Some help is shown to users that have no profile picture yet');
        // Upload an image
        casper.fill('form#changepic-form', {
            'file': 'tests/casperjs/data/balloons.jpg'
        }, false);
        casper.waitForSelector('.jcrop-holder', function() {
            // Verify the image is showing in the cropping area
            test.assertExists('.jcrop-holder > img', 'The image is showing in the cropping area');
            // Verify the 'set picture' button is present
            test.assertExists('#changepic-set', 'The \'Set picture\' button is present');
            // Click the button
            casper.click('#changepic-set');
            // Verify that setting the picture worked
            casper.waitForSelector('#oae-notification-container .alert', function() {
                test.assertDoesntExist('#oae-notification-container .alert.alert-error', 'Picture successfully submitted and stored');
                casper.click('#oae-notification-container .close');
            });
        });
    };

    /**
     * Goes through the workflow of uploading and saving the user picture
     */
    var verifyLargePictureValidation = function() {
        // Verify the upload form is present
        test.assertExists('form#changepic-form', 'The change picture form is present');
        // Upload an image over 10 megabytes to trigger validation
        casper.fill('form#changepic-form', {
            'file': 'tests/casperjs/data/guitar.png'
        }, false);
        // Verify that the picture failed to be set
        casper.waitForSelector('#oae-notification-container .alert', function() {
            test.assertExists('#oae-notification-container .alert.alert-error', 'Pictures over 10MB are rejected');
            casper.click('#oae-notification-container .close');
        });
    };

    casper.start(configUtil.tenantUI, function() {
        // Create a user to test changepicture with
        userUtil.createUsers(1, function(user1) {
            // Login with that user
            userUtil.doLogIn(user1.username, user1.password);
            uiUtil.openMe();

            // Open the changepicture modal
            casper.then(function() {
                casper.echo('# Verify open change picture modal', 'INFO');
                openChangePicture();
            });

            // Verify picture upload
            casper.then(function() {
                casper.echo('# Verify picture upload', 'INFO');
                verifyPictureUpload();
            });

            // Verify picture upload validation
            casper.then(function() {
                casper.echo('# Verify pictures over 10MB aren\'t accepted', 'INFO');
                casper.reload(function() {
                    casper.then(openChangePicture);
                    casper.then(verifyLargePictureValidation);
                });
            });

            // Log out at the end of the test
            userUtil.doLogOut();
        });
    });

    casper.run(function() {
        test.done();
    });
});

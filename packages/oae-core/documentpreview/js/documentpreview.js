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

define(['jquery', 'underscore', 'oae.core', 'lazyload'], function($, _, oae) {

    return function(uid, showSettings, widgetData) {

        // The widget container
        var $rootel = $('#' + uid);

        // Supported zoom levels listed in sorted order
        var ZOOMLEVELS = [0.33, 0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.50, 2, 5];

        // Margin including container padding and box shadow size (in pixels)
        var CONTENT_RIGHT_MARGIN = 24;

        // Vertical spacing between pages (in pixels)
        var CONTENT_PAGE_SPACING = 15;

        // Variable that keeps track of the current page and zoom level of the document
        var state = {
            'zoomLevel': 1,
            'pageNumber': 1
        };

        // Variable that tracks state on the pages in the document
        var pages = [];

        // Page number of the last page that has been loaded so far
        var lastPageLoaded = 0;

        // Variable that keeps track of whether or not an individual page is being loaded.
        // This prevents making a request whilst there is still one in progress
        var isLoadingPage = false;

        // Variable that keeps track of whether or not a specific page that has been requested,
        // and all of the unloaded pages before that, are being loaded
        var isLoadingPages = false;


        ///////////////////////////////
        // Cached Element References //
        ///////////////////////////////

        var $widget = $('#documentpreview-widget', $rootel);
        var $content = $('#documentpreview-content', $rootel);
        var $zoomIn = $('#documentpreview-zoom-in', $rootel);
        var $zoomOut = $('#documentpreview-zoom-out', $rootel);
        var $fullScreen = $('#documentpreview-full-screen', $rootel);
        var $pageControls = $('#documentpreview-page-controls', $rootel);
        var $prevPage = $('#documentpreview-page-prev', $rootel);
        var $pageNumber = $('#documentpreview-page-num', $rootel);
        var $nextPage = $('#documentpreview-page-next', $rootel);
        var $spacer = $('#documentpreview-content-spacer', $rootel);


        ////////////////////////////////
        // Page loading and rendering //
        ////////////////////////////////

        /**
         * Load a document page and append it to the document viewer
         *
         * @param  {Object}         page                Page object representing the page that needs to be loaded and rendered
         * @param  {Function}       [callback]          Standard callback function
         * @param  {Object}         [callback.err]      Error object containing error code and error message
         * @param  {Boolean}        [_isRetryAttempt]   `true` if we attempted to load this page previously
         */
        var loadPage = function(page, callback, _isRetryAttempt) {
            // Set a default callback function in case no callback function has been provided
            callback = callback || function() {};
            // Indicates whether or not we attempted to load this page previously
            _isRetryAttempt = _isRetryAttempt || false;

            // Don't reload the page if it has already been loaded
            if (page.$el) {
                return callback();
            }
            // Indicate that a page is being loaded, so no other pages are loaded at the same time
            isLoadingPage = true;

            // Keep track of the last page in the document that was loaded
            lastPageLoaded = page.pageNumber;

            // Add the page container, containing a loading indicator
            $spacer.before(oae.api.util.template().render($('#documentpreview-content-page-template', $rootel), {
                'cssScopeClass': widgetData.previews.cssScopeClass,
                'pageNumber': page.pageNumber
            }));

            // Cache a reference to the page element
            page.$el = $('.documentpreview-content-page[data-page-number="' + page.pageNumber + '"]', $rootel);

            // Cache the height and calculated top margin of the
            // element as they are needed for zoom calculations
            page.height = page.$el.height();
            page.marginTop = CONTENT_PAGE_SPACING;

            // Request the page content
            $.ajax({
                'url': constructDocumentPreviewURL('page.' + page.pageNumber + '.svg'),
                'crossDomain': true,
                'dataType': 'text',
                'success': function(response) {
                    // Replace the loading indicator with the page content
                    var xml = jQuery.parseXML(response);
                    page.$el.html(xml.documentElement);
                    page.$el.children().css('display', 'block');

                    // Update the height now that we have real content
                    page.height = page.$el.height();

                    // If the page being loaded is the first page of the document, we adjust
                    // the zoom level based on the available space to make sure that the page
                    // fully fits inside of the viewer
                    if (page.pageNumber === 1) {
                        determineZoomLevel(page);
                    }

                    // Adjust the page display and any pages following it to reflect the
                    // current zoom level
                    zoomPages(page.pageNumber);

                    // Indicate that the page has finished loading, so more pages can be loaded
                    isLoadingPage = false;

                    // Check if a new page should be loaded in case we're still close to the bottom of the container
                    if (!isLoadingPages) {
                        loadPagesForInfiniteScrolling();
                    }

                    callback();
                },
                'error': function(jqXHR, textStatus) {
                    // If the user has been reading a document for a while, it's possible that the signature expired
                    // If we could not load the page due to a 401 (access denied) and it's the first time we tried loading this
                    // particular page, we refresh the signature and try again
                    if (jqXHR.status === 401 && !_isRetryAttempt) {
                        return refreshSignature(function(err) {
                            if (err) {
                                return callback(err);
                            }

                            // Remove the loading indicator and delete the cached reference to it
                            page.$el.remove();
                            delete page.$el;

                            // Try loading the page again
                            return loadPage(page, callback, true);
                        });
                    }

                    // For all other error responses, we pass the error back up the call stack
                    return callback({'code': jqXHR.status, 'msg': jqXHR.responseText});
                }
            });
        };

        /**
         * Load all pages up until a specific page and scroll to that page. Only pages that haven't been loaded yet will be loaded.
         * In order to make sure that the loading of new pages that could occur after scrolling to the requested page doesn't interfere
         * with the scroll position that was set, a container worth of pages will be loaded after the requested page to avoid this
         * from happening
         *
         * @param  {Number}     pageNumber          Page number of the requested page
         */
        var loadPages = function(pageNumber) {
            // If a set of pages is already being preloaded, the new
            // request is cancelled
            if (isLoadingPages) {
                return;
            }
            isLoadingPages = true;

            // Add a loading indicator to the document as the preloading
            // can take a while in large documents
            $content.addClass('documentpreview-content-preloading');

            /**
             * Stop the page loading process when all required pages have
             * been loaded or when an error has occurred during loading
             */
            var stopLoadingPages = function() {
                isLoadingPages = false;
                // Remove the loading indicator from the document
                $content.removeClass('documentpreview-content-preloading');
                // Scroll to the requested page
                scrollToPage(pages[pageNumber - 1]);
            };

            /**
             * Recursive function that will load a page and will subsequently
             * load the next page until all pages have been preloaded
             *
             * @param  {Object}         [err]             Error object containing error code and error message
             */
            var loadNextPage = function(err) {
                if (err) {
                    return stopLoadingPages();
                }

                // In case the requested page hasn't been reached yet, the next page is loaded
                if (lastPageLoaded < pageNumber) {
                    loadPage(pages[lastPageLoaded], loadNextPage);
                } else {
                    // If the requested page has been loaded,
                    // we make sure that there is a container worth of pages below the requested page to make sure that the loading of new pages that
                    // could occur after scrolling to the requested page doesn't interfere with the scroll position set when scrolling to the requested page.
                    var requestedPage = pages[pageNumber - 1];
                    var spaceBelowRequestedPage = $content.prop('scrollHeight') - requestedPage.$el.position().top - $content.height();
                    if (lastPageLoaded < widgetData.previews.pageCount && spaceBelowRequestedPage < $content.height()) {
                        loadPage(pages[lastPageLoaded], loadNextPage);
                    } else {
                        stopLoadingPages();
                    }
                }
            };

            loadNextPage();
        };

        /**
         * Construct a signed URL for one of the document resources
         *
         * @param  {String}     resourceName        Name of the document resource for which a signed URL needs to be constructed
         * @return {String}                         Signed URL for the requested document resource
         */
        var constructDocumentPreviewURL = function(resourceName) {
            return '/api/content/' + widgetData.id +
                   '/revisions/' + widgetData.latestRevisionId +
                   '/previews/' + resourceName +
                   // Place the content signature parameters in the query string
                   '?' + $.param(widgetData.signature);
        };

        /**
         * Refresh the signature.
         *
         * @param  {Function}   callback          Standard callback function
         * @param  {Object}     [callback.err]    Error object containing error code and error message
         */
        var refreshSignature = function(callback) {
            oae.api.content.getContent(widgetData.id, function(err, content) {
                if (err) {
                    return callback(err);
                }

                widgetData = content;
                return callback();
            });
        };


        ////////////////////////
        // Infinite scrolling //
        ////////////////////////

        /**
         * Ensure the container is full enough to scroll
         */
        var loadPagesForInfiniteScrolling = function() {
            // If all pages have been loaded, there's nothing more to do
            if (lastPageLoaded < widgetData.previews.pageCount && !isLoadingPage && !isLoadingPages) {
                // Ensure that we load at least another container below the fold
                if (($content.prop('scrollHeight') - $content.height() - $content.scrollTop())  <  $content.height()) {
                    loadPage(pages[lastPageLoaded]);
                }
            }
        };

        /**
         * Function executed when the document viewer content container is scrolled. Detects what the currently visible
         * page is and updates the toolbar accordingly
         */
        var scrollContent = function() {
            // Detect the currently visible page
            var visiblePage = detectVisiblePage();
            if (visiblePage) {
                // Update the toolbar when the viewer has moved on to a different page
                if (visiblePage.pageNumber !== state.pageNumber) {
                    state.pageNumber = visiblePage.pageNumber;
                    updateToolbar();
                }
            }

            // Load more pages in case we're close to the end of the loaded set of pages
            loadPagesForInfiniteScrolling();
        };

        /**
         * Detect the page that is currently visible in the document viewer
         *
         * @return {Object}                     Page object representing the currently visible page
         */
        var detectVisiblePage = function() {
            // Find the first page that is visible in the content container
            var visiblePage = _.find(pages, function(page) {
                return page.$el && (page.$el.position().top + page.marginTop + page.height * state.zoomLevel) > 0;
            });
            return visiblePage;
        };


        /////////////
        // Toolbar //
        /////////////

        /**
         * Update the toolbar to reflect the current state of the document viewer
         */
        var updateToolbar = function() {
            // Enable/disable the zooming and page navigations controls
            var zoomIndex = _.indexOf(ZOOMLEVELS, state.zoomLevel);
            $zoomOut.prop('disabled', (zoomIndex <= 0));
            $zoomIn.prop('disabled', (zoomIndex >= (ZOOMLEVELS.length - 1)));
            $nextPage.prop('disabled', (state.pageNumber >= widgetData.previews.pageCount));

            // Display the page number for the currently visible page
            $pageNumber.val(state.pageNumber);
        };


        /////////////////////
        // Page navigation //
        /////////////////////

        /**
         * Scroll to a specific page in the document
         *
         * @param  {Object}         page        Page object representing the page that needs to be scrolled to
         */
        var scrollToPage = function(page) {
            // Load the page in case it hasn't been loaded yet
            loadPage(page, function() {
                // Scroll to the page's position
                $content.scrollTop($content.scrollTop() +
                    page.$el.position().top +
                    page.marginTop -
                    CONTENT_PAGE_SPACING / 2);
                // Update the toolbar to reflect the new position
                updateToolbar();
            });
        };

        /**
         * Display a page that was directly requested through a page number. If any of its preceding
         * pages haven't been loaded yet, they are loaded first. After that, the requested page is
         * loaded (if required) and shown
         */
        var pageInput = function() {
            var pageNumber = parseInt($pageNumber.val(), 10);

            // Check if the provided page number is valid
            if (!(_.isNaN(pageNumber)) && pageNumber >= 1 && pageNumber <= widgetData.previews.pageCount) {
                state.pageNumber = pageNumber;

                // Load the requested page
                loadPages(pageNumber);
            }

            // Return false to prevent the form from being submitted
            return false;
        };

        /**
         * Move to the previous page in the document
         */
        var prevPage = function() {
            if (state.pageNumber > 1) {
                state.pageNumber--;
            }
            // Always execute the `scrollTo`, even if user is already on page 1,
            // so that the user can easily get to the top of the document
            scrollToPage(pages[state.pageNumber - 1]);
        };

        /**
         * Move to the next page in the document and load it if the page hasn't been
         * loaded yet
         */
        var nextPage = function() {
            if (state.pageNumber < widgetData.previews.pageCount) {
                state.pageNumber++;
                scrollToPage(pages[state.pageNumber - 1]);
            }
        };


        //////////
        // Zoom //
        //////////

        /**
         * Determine the highest zoom level at which the provided page fits into the
         * page container if the page currently doesn't fit inside of the page container.
         * The document's zoom level will then be adjusted to this level.
         *
         * @param  {Object}     page            Page object representing the page for which to determine the zoom level
         */
        var determineZoomLevel = function(page) {
            // Cache the width of the loaded page at the current zoom level
            var pageWidth = page.$el.children().first().width();
            // Determine the width of the page container
            var contentWidth = $content.width();

            // When the loaded page doesn't fit inside of the page container,
            // we determine the highest zoom level at which the page does fit
            // into the container and adjust the zoom level of the document
            if (pageWidth > contentWidth) {
                // Initially, set the zoom level to the smallest zoom level. If no
                // zoom level can be found at which the page fits in the container,
                // this will be used as the fallback zoom level value
                state.zoomLevel = ZOOMLEVELS[0];
                // Reverse the zoom levels to make it easier to loop from largest
                // zoom level to smallest zoom level. This helps finding the largest
                // zoom level at which the page fits in the container
                var reversedZoomLevels = ZOOMLEVELS.slice().reverse();
                for (var z = 0; z < reversedZoomLevels.length; z++) {
                    // Calculate the new width of the page at the current zoom level
                    var adjustedWidth = pageWidth * reversedZoomLevels[z];
                    // If the page at the adjusted zoom level fits into the container,
                    // adjust the document's zoom level and avoid investigating smaller
                    // zoom levels
                    if (adjustedWidth < contentWidth) {
                        state.zoomLevel = reversedZoomLevels[z];
                        break;
                    }
                }
            }
        };

        /**
         * Scale and adjust pages based on document zoom level
         *
         * This function adjusts the margins of the pages to account
         * for the way browsers handle scale transforms. In normal
         * (unscaled) display, the pages flow one after the other
         * in the wrapper, as in:
         *            ┌───┐
         *            │ 1 │
         *            └───┘
         *            ┌───┐
         *            │ 2 │
         *            └───┘
         * When the pages are scaled, we would likle the browser to
         * automatically adjusted the pages' position within the flow
         * to account for their new size, as in:
         *           ┌─────┐
         *           │┌───┐│
         *           ││ 1 ││
         *           │└───┘│
         *           └─────┘
         *           ┌─────┐
         *           │┌───┐│
         *           ││ 2 ││
         *           │└───┘│
         *           └─────┘
         * Instead, however, the pages retain their original position
         * in the flow, resulting in:
         *         + ┌─────┐
         *         | │┌───┐│
         *  Page 1 | ││ 1 ││
         *         | ├┴───┴┤ +
         *         + ├┬───┬┤ |
         *           ││ 2 ││ | Page 2
         *           │└───┘│ |
         *           └─────┘ +
         * To address that issue we manually set the margin of each
         * page to move it up or down and vertically position it
         * appropriately based on the zoom factor.
         *
         * @param  {Number}     [pageNumber]            document page number to start (first page is 1)
         */
        var zoomPages = function(pageNumber) {
            // Index into pages array (default to 0)
            var pageIdx = pageNumber ? pageNumber - 1 : 0;
            // Amount of margin for current page
            var marginTop = CONTENT_PAGE_SPACING;

            // If not starting at first page, looked for top margin from previous page
            if (pageIdx > 0 && pages[pageIdx - 1].nextMargin) {
                marginTop = pages[pageIdx - 1].nextMargin;
            }

            for (; pageIdx < pages.length; pageIdx++) {
                // Current page
                var page = pages[pageIdx];

                // Only process pages that have content
                if (!page.$el) {
                    break;
                }

                // Scale the page
                page.$el.css({
                    'margin-top': marginTop + 'px',
                    'transform': 'scale(' + state.zoomLevel + ')',
                    'width': 100 / state.zoomLevel + '%'
                });

                // Cache the top margin
                page.marginTop = marginTop;

                // Calculate the margin the next page or spacer will require
                marginTop = (page.height * state.zoomLevel - page.height) +
                    CONTENT_PAGE_SPACING * state.zoomLevel;

                // Cache that as well
                page.nextMargin = marginTop;
            }

            // Account for zooming on horizontal overflow
            var widestPage = _.max($('.documentpreview-content-page', $content), function(el) {
                return el.scrollWidth;
            });

            $spacer.css({
                'width': _.isObject(widestPage) && ($(widestPage).width() < widestPage.scrollWidth) ?
                    (state.zoomLevel * widestPage.scrollWidth + CONTENT_RIGHT_MARGIN ) + 'px' : '',
                'margin-top': marginTop
            });
        };

        /**
         * Modify the zoom level of the document. This involves scaling and repositioning all loaded
         * pages and changing the scroll position to reflect the position before the zoom change
         *
         * @param  {Number}         zoom                New zoom level for the document
         */
        var changeZoom = function(zoom) {
            // Remember the current scroll position
            var currentPage = pages[state.pageNumber - 1];
            var oldZoom = state.zoomLevel;
            var oldPagePosition = currentPage.$el.position().top + currentPage.marginTop;

            // Scale all loaded pages
            state.zoomLevel = zoom;
            zoomPages();

            // Restore the scroll position
            $content.scrollTop($content.scrollTop() +
                currentPage.$el.position().top + currentPage.marginTop -
                oldPagePosition * (zoom / oldZoom));

            updateToolbar();
        };

        /**
         * Zoom the document in to the next zoom level
         */
        var zoomIn = function() {
            var zoomIndex = _.indexOf(ZOOMLEVELS, state.zoomLevel);
            if (zoomIndex < (ZOOMLEVELS.length - 1)) {
                changeZoom(ZOOMLEVELS[zoomIndex + 1]);
                loadPagesForInfiniteScrolling();
            }
        };

        /**
         * Zoom the document out to the previous zoom level
         */
        var zoomOut = function() {
            var zoomIndex = _.indexOf(ZOOMLEVELS, state.zoomLevel);
            if (zoomIndex > 0) {
                changeZoom(ZOOMLEVELS[zoomIndex - 1]);
                loadPagesForInfiniteScrolling();
            }
        };


        /////////////////
        // Full screen //
        /////////////////

        /**
         * Show the document in full screen mode when it is currently showing in regular mode, or return
         * the document to regular mode when the document is showing in full screen mode
         */
        var toggleFullscreen = function() {
            if (isFullscreenActive()) {
                deactivateFullscreen();
            } else {
                activateFullscreen();
            }
        };

        /**
         * Check whether or not the document is currently being dislayed
         * in full screen mode
         *
         * @return {Boolean}            `true` if the browsers is displaying in full screen and `false` when it isn't
         */
        var isFullscreenActive = function() {
            return document.fullscreenElement ||
                   document.mozFullScreenElement ||
                   document.msFullscreenElement ||
                   document.webkitFullscreenElement;
        };

        /**
         * Display the document in full screen using the
         * HTML5 full screen API
         */
        var activateFullscreen = function() {
            var viewerEl = $widget[0];
            if (viewerEl.requestFullscreen) {
                viewerEl.requestFullscreen();
            } else if (viewerEl.mozRequestFullScreen) {
                viewerEl.mozRequestFullScreen();
            } else if (viewerEl.msRequestFullscreen) {
                viewerEl.msRequestFullscreen();
            } else if (viewerEl.webkitRequestFullscreen) {
                viewerEl.webkitRequestFullscreen();
            }

            // Load more pages in case we're closer to the end of the loaded set of pages
            loadPagesForInfiniteScrolling();
        };

        /**
         * Return a full screen document to the regular screen
         */
        var deactivateFullscreen = function() {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        };

        /**
         * Apply/remove a CSS class to indicate whether or not the document is in
         * full screen mode
         */
        var fullScreenChanged = function() {
            $widget.toggleClass('documentpreview-fullscreen');
            // Change the icon of the fullscreen button according to the view's state
            $fullScreen.find('i').toggleClass('fa-compress').toggleClass('fa-expand');
        };

        /**
         * Check whether or not the browser supports the HTML5
         * full screen API
         *
         * @return {Boolean}            `true` if the browsers support full screen and `false` when it doesn't
         * @see http://www.w3.org/TR/fullscreen/
         */
        var isFullscreenSupported = function() {
            return document.fullscreenEnabled ||
                   document.mozFullScreenEnabled ||
                   document.msFullscreenEnabled ||
                   document.webkitFullscreenEnabled;
        };


        ////////////////////
        // Initialization //
        ////////////////////

        /**
         * Inject the stylesheets that have been generated by pdf2htmlEX for the
         * current document
         */
        var loadStyleSheets = function() {
            // Remove the stylesheets from any documents that might have been previously
            // loaded, as the styles can conflict
            $('head .lazyload').remove();

            // The stylesheets are loaded before the pages are loaded to avoid display issues
            // when any of the pages are be loaded before the stylesheets are loaded
            LazyLoad.css([constructDocumentPreviewURL('combined.css')], function() {
                // Load the first page
                loadPage(pages[0]);
            });
        };

        /**
         * Add the different event bindings
         */
        var addBinding = function() {
            // Zooming
            $zoomIn.on('click', zoomIn);
            $zoomOut.on('click', zoomOut);

            // Full screen
            $fullScreen.on('click', toggleFullscreen);
            $(document).on('fullscreenchange mozfullscreenchange MSFullscreenChange webkitfullscreenchange', fullScreenChanged);

            // Page navigation
            $prevPage.on('click', prevPage);
            $nextPage.on('click', nextPage);
            $pageControls.on('submit', pageInput);

            // Page infinite scrolling
            $content.on('scroll', _.throttle(scrollContent, 100));
        };

        /**
         * Set up the document preview widget by loading the document stylesheets
         * and preparing the toolbar
         */
        var setUpDocumentPreview = function() {
            // Create objects for each of the pages in the document
            for (var p = 0; p < widgetData.previews.pageCount; p++) {
                pages.push({
                    'pageNumber': p + 1  // Document page numbers start at 1
                });
            }

            // Add the document's page count to the toolbar
            $('#documentpreview-page-count', $rootel).text(widgetData.previews.pageCount);
            // Enable the full screen toggle button when the browser supports the
            // HTML5 full screen API
            if (isFullscreenSupported()) {
                $fullScreen.show();
            }
            updateToolbar();

            // Load the document stylesheets
            loadStyleSheets();
        };

        addBinding();
        setUpDocumentPreview();

    };
});

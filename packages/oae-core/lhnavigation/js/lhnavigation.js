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

define(['jquery', 'oae.core', 'jquery.history'], function($, oae) {

    return function(uid) {

        // The widget container
        var $rootel = $('#' + uid);

        // Variable that will be used to keep track of the provided page structure
        var lhNavigationPages = null;

        // Variable that will be used to keep track of the base URL of the current page
        var baseUrl = null;

        // Variable that will be used to keep track of the first part of the browser title
        // that needs to be set for each page
        var baseBrowserTitle = null;

        /**
         * Render a newly selected page. We first deselect the previously selected page, and then put an active
         * marker on the newly selected page in the navigation. Next, the page content associated to that is shown
         * (if it has been rendered previously) or rendered.
         */
        var renderPage = function() {
            // Remove the active indicator on the previously selected page
            $('.oae-lhnavigation ul li', $rootel).removeClass('active');

            // Get the current page from the History.js state and select it
            var selectedPage = getPage(History.getState().data.page);
            // Mark the selected page as active in the left hand navigation
            $('.oae-lhnavigation ul li[data-id="' + selectedPage.id + '"]', $rootel).addClass('active');

            // Set the browser title
            var browserTitle = baseBrowserTitle ? [baseBrowserTitle] : [];
            browserTitle.push(selectedPage.title);
            oae.api.util.setBrowserTitle(browserTitle);

            // Hide the current open page
            $('.oae-page > div:not(#lhnavigation-toggle-container)', $rootel).hide();

            // Render the page's content. We first check if the page has been rendered before. If that's
            // the case, we just show it again. Otherwise, we render the page structure first and render
            // all of the widgets
            var $pageContainer = $('.oae-page', $rootel);
            var $cachedPage = $('div[data-page="' + selectedPage.id + '"]', $pageContainer);
            if ($cachedPage.length > 0) {
                $cachedPage.show();

                // Re-apply multi-line threedotting to the tile titles
                $('.oae-tile .oae-tile-title').trigger('update');
            } else {
                $pageContainer.append(oae.api.util.template().render($('#lhnavigation-page-template'), {
                    'selectedPage': selectedPage
                }));

                // Collect the widget data into a format that is understood by the widget loader
                var widgetData = {};
                $.each(selectedPage.layout, function(columnIndex, column) {
                    $.each(column.widgets, function(widgetIndex, widget) {
                        if (widget.settings) {
                            widgetData['lhnavigation-widget-' + (widget.id || widget.name)] = widget.settings;
                        }
                    });
                });

                // Render the widgets and pass in the widget data
                oae.api.widget.loadWidgets($pageContainer, false, widgetData);
            }
        };

        /**
         * Get the page with a given page id from the provided page structure.
         *
         * @param  {String}     pageId      Id of the page we want to retrieve from the provided pagestructure
         * @return {Object}                 Object representing the page with the provided page id. If no page with the provided page id can be found, the first page will be returned
         */
        var getPage = function(pageId) {
            for (var i = 0; i < lhNavigationPages.length; i++) {
                if (lhNavigationPages[i].id === pageId) {
                    return lhNavigationPages[i];
                }
            }
            // Return the first page if no page with the provided id can be found
            return lhNavigationPages[0];
        };

        /**
         * Render the left hand navigation based on the structure that has been passed in
         * and start listening to click events for the different elements in there.
         *
         * @param  {Object[]}    lhNavPages                 The page navigation structure
         * @param  {Object[]}    [lhNavActions]             The action buttons structure
         * @param  {String}      [baseUrl]                  The current page's base URL. The different page ids will be appended to this to generate the full URL of each page
         */
        var setUpNavigation = function(lhNavPages, lhNavActions, baseUrl) {
            // Render the navigation
            var renderedNavigation = oae.api.util.template().render($('#lhnavigation-navigation-template', $rootel), {
                'lhNavPages': lhNavPages,
                'lhNavActions': lhNavActions,
                'baseUrl': baseUrl
            });
            $('.oae-lhnavigation > ul.nav', $rootel).html(renderedNavigation);

            // Render clip actions first
            if (lhNavActions && lhNavActions.length) {
                setUpNavigationActions();
            }

            // Extract the currently selected page from the URL by parsing the URL fragment that's
            // inside of the current History.js hash. The expected URL structure is
            // `<baseUrl>/<pageId>/[<widgetPath>][?q=foo]`, where `pageId` represents the id of the
            // current page and `widgetPath` represents an optional URL fragment added by the page's
            // widget for internal navigation purposes.
            //
            // Note that due to URL encoding inconsistencies in History.js, we need to do some
            // mangling to the URL to ensure we can parse the URL in a reasonable manner.
            //
            // Specifically, if there is a %40 (encoded @) symbol in the query string (i.e., an
            // email address) then the History.js module will automatically decode it with the rest
            // of the URL so that the URL cannot be parsed as a whole with any URL parsing library.
            var loadedUrl = oae.api.util.url(History.getState().cleanUrl);

            // Get the path of the page. We have to do this separately to avoid an issue if there is
            // %40 (encoded @) in the querystring somewhere. Note this will break if there is an
            // encoded `@` or `/` or a multitude of other characters in the path (e.g.,
            // `/some/%40/path/with/encoding/character`), but lets hope that's never needed
            var loadedPath = '/' + History.getState().hash.split('?')[0];

            // Remove the `baseUrl` from the URL
            var baseUrlSegments = _.compact(baseUrl.split('/'));
            var loadedUrlSegments = loadedUrl.segment().slice(baseUrlSegments.length);

            // Extract the selected page from the URL. Note that the page id will not be
            // present in the URL when the base URL has been opened in itself. In that case,
            // we re-assign the page id once the first page in the navigation has been returned.
            var pageId = loadedUrlSegments[0];
            var selectedPage = getPage(pageId);
            pageId = selectedPage.id;
            var widgetPath = loadedUrlSegments[1];

            // Retrieve the search query from the querystring
            var query = loadedUrl.param().q;

            // When the page loads, the History.js state data object will either be empty (when having
            // followed a link or entering the URL directly) or will contain the previous state data when
            // refreshing the page. This is why we use the URL to determine the initial state. We want
            // to replace the initial state with all of the required state data for the requested URL so
            // we have the correct state data in all circumstances. Calling the `replaceState` function
            // will automatically trigger the statechange event, which will take care of the page rendering.
            // for the requested module. However, as the page can already have the History.js state data
            // when only doing a page refresh, we need to add a random number to make sure that History.js
            // recognizes this as a new state and triggers the `statechange` event.
            var data = {
                'basePath': baseUrl + '/' + pageId,
                'page': pageId,
                'widgetPath': widgetPath,
                '_': Math.random()
            };

            // Although the `title` and `url` field are optional, we need to enter them as IE9 simply doesn't
            // handle their absense very well. We cannot lose any parameters such as the `q` query string
            // parameter as IE9 is not able to recover it from its state.
            var title = selectedPage.title;
            if (query) {
                data.query = query;
                loadedPath += '?q=' + query;
            }

            History.replaceState(data, title, loadedPath);

            // Bind the click event
            $rootel.on('click', '.oae-lhnavigation ul li[data-id]', function(ev) {
                // Only push state when a link other than the active one has been clicked
                if (!$(this).hasClass('active')) {
                    var page = getPage($(this).attr('data-id'));
                    var title = page.title;
                    var url = $('a', $(this)).attr('href');
                    var data = {
                        'basePath': url,
                        'page': page.id
                    };
                    // Push the state and render the selected page
                    History.pushState(data, title, url);
                }
                ev.preventDefault();
            });
        };

        /**
         * Bind the navigation actions
         */
        var setUpNavigationActions = function() {
            // Set up the collapsable menu items
            $rootel.on('click', '.oae-lhnavigation > ul > li > button', function(ev) {
                $(this).next('.lhnavigation-collapsed').toggle({
                    'duration': 250,
                    'easing': 'linear'
                });
                $(this).find('.lhnavigation-caret-container i').toggle();
            });
        };

        /**
         * The statechange event will be triggered every time the browser back or forward button
         * is pressed or state is pushed/replaced using History.js.
         */
        $(window).on('statechange', renderPage);

        /**
         * Initialise a new left hand navigation structure by triggering event that define the pages
         * and actions that need to be rendered in the navigation. In case this widget isn't ready at
         * the time when the supplying page sends out its request, we also send out a ready event,
         * which allows for the supplying widget to resend its data.
         *
         * A left hand navigation contains 2 different sections. The first section is a list of action
         * buttons that can replace the page clips when the viewport width is too small to render them.
         * These actions can also be grouped into collapsible sections. An example array required to
         * initiate these action buttons is the following:
         *
         * [
         *     {
         *         'icon': 'fa-cloud-upload',
         *         'title': oae.api.i18n.translate('__MSG__UPLOAD__'),
         *         'class': 'oae-trigger-upload'
         *     },
         *     {
         *         'icon': 'fa-plus-circle',
         *         'title': oae.api.i18n.translate('__MSG__CREATE__'),
         *         'children': [
         *             {
         *                 'icon': 'fa-group',
         *                 'title': oae.api.i18n.translate('__MSG__GROUP__'),
         *                 'class': 'oae-trigger-creategroup'
         *             }
         *         ]
         *     }
         * ]
         *
         * Notes:
         *
         * - `title` is the title of the action button.
         * - `icon` is the FontAwesome icon class that preceeds the title of the action button.
         *    @see http://fontawesome.io/3.2.1/
         * - `class` can be used to add one or more CSS classes to the action button. Multiple classes can be
         *    added by separating them with a space. This can for example be used to add widget triggers to
         *    an action button.
         * - `closeNav` determines whether or not the left hand navigation should be closed when the current
         *   item is seelcted.
         * - `children` is an optional array of action buttons that will be rendered as children of the list item
         *   it belongs to. Each child item has the same properties as top level items.
         *
         * The second section is a list of pages. Each of these pages will render one or more widgets when clicked.
         * An example array required to initiate these pages is the following:
         *
         * [
         *     {
         *         'id': 'dashboard',
         *         'title': oae.api.i18n.translate('__MSG__RECENT_ACTIVITY__'),
         *         'closeNav': true,
         *         'icon': 'fa-tachometer',
         *         'layout': [
         *             {
         *                 'id': 'activity',
         *                 'width': 'col-md-12',
         *                 'widgets': [
         *                         'name': 'activity',
         *                         'settings': {
         *                             'context': oae.data.me,
         *                             'canManage': true
         *                         }
         *                     }
         *                 ]
         *             }
         *         ]
         *     }
         * ]
         *
         * Notes:
         *
         * - `id` is the page alias that will be used in the url (e.g. /baseUrl/<pageId>).
         * - `title` is the title of the navigation item.
         * - `icon` is the FontAwesome icon class that preceeds the title of the navigation item.
         *    @see http://fontawesome.io/3.2.1/
         * - `layout` defines the structure of the page that is associated to the navigation item.
         *    It contains the following properties:
         *     - `width` defines the page width, leveraging Bootstrap's grid system
         *       @see http://getbootstrap.com/css/#grid
         *     - `widgets` defines an array of widgets to be loaded on the page containing the following properties:
         *         - `id` is the unique id that should be applied to the widget container. If no `id` is provided,
         *            the widget name will be used instead
         *         - `name` is the name of the widget to be loaded
         *         - `settings` is a widget settings object that will be passed into the widget as widget data
         */
        $(window).on('oae.trigger.lhnavigation', function(ev, _lhNavigationPages, _lhNavigationActions, _baseUrl, _baseBrowserTitle) {
            lhNavigationPages = _lhNavigationPages;
            baseUrl = _baseUrl;
            baseBrowserTitle = _baseBrowserTitle;
            setUpNavigation(_lhNavigationPages, _lhNavigationActions, _baseUrl);
        });
        $(window).trigger('oae.ready.lhnavigation');

    };
});

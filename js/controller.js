require([ "jquery", "route", "page", "jquery.history" ], function($, route, page) {

    var History = window.History,
        document = window.document;

    if (!History.enabled) {
        console.log('History not enabled');
        return false;
    }

    // wait for the document
    $(function() {
        var $body = $(document.body),
            rootUrl = History.getRootUrl();

        // load a link or submit a form via Ajax so we don't leave the page
        function hijaxLink(event) {
            console.log('hijaxLink', event);

            var $this = $(this),
                url;
                
            if ($this.is('a')) {
                // click on a link
                if ($this.attr('data-role') === 'back') {
                    console.log('going back');
                    History.back();
                    event.preventDefault();
                    return false;
                }
                url = $this.attr('href');

            } else if ($this.is('form')) {
                // submiting a form
                var method = $this.attr('method') || 'get';
                if (method.toLowerCase() !== 'post') {
                    // method is get
                    var action = $this.attr('action');
                    if (!action) {
                        action = '';
                    }
                    action = action.replace(/\?.*/, ''); // remove any query parameters as the browser apparently would
                    url = action + '?' + $this.serialize();

                } else {
                    console.log('not hijaxing post');
                    return true;
                }
            }
            
           // Continue as normal for ctrl clicks or external links
            if (event.which === 2 || event.metaKey || event.ctrlKey ||
                ( url.substring(0,rootUrl.length) !== rootUrl && url.indexOf(':') !== -1 ) ||
                url.indexOf('#') !== -1 ) {
                console.log('not hijaxing', url);
                return true;
            }
            
            // hijax this link
            History.pushState(null,null,url);
            event.preventDefault();
            return false;
        }

        // hookup links
        $body.on('click', 'a:not(.no-ajaxy)', hijaxLink);

        // and forms
        $body.on('submit', 'form:not(.no-ajaxy)', hijaxLink);

        // hook into state changes
        $(window).on('statechange', function() {
            var State = History.getState(),
                url = State.url;

            if (route.doRoute(url)) {
                return; // handled elsewhere
            }

            // loading
            $body.addClass('loading');

            // request the page
            $.ajax({
                url: url,
                data: { ajax: 1 }, // signal this is a ajax request right in the URL
                success: function(data, textStatus, jqXHR) {
                    var $newPage = $(data),
                        type = $newPage.attr('class').match(/[-a-z]+-page/)[0],
                        $oldPage = page.getInactive(type);
                    $oldPage.replaceWith($newPage);
                    page.transitionTo($newPage);
                    $(window).scrollTop(0);

                    $body.removeClass('loading');

                    //$content.animate({opacity:1}, 500);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log('ajax request failed for: ', url);
                    document.location.href = url;
                    return false;
                }
            }); // end ajax
        }); // end on statechange
    }); // end on dom ready
});
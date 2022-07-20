/* book.js render a book page */

define([
  "route",
  "page",
  "templates",
  "keyboard",
  "state",
  "speech",
  "ios",
  "store"
], function(route, page, templates, keys, state, speech, ios, store) {
  var picBoxSize = {}; // sizing the pic box same as last time

  function pageLink(link, page) {
    if (page === 1) {
      return link;
    } else if (link.match(/^\/\?p=.*/)) {
      return link + "&page=" + page;
    } else {
      return link + page + "/";
    }
  }

  function renderBook(url, slug, pageNumber) {
    //console.log('renderBook', url, slug, pageNumber, this);
    // only render a book locally when the link has data-type=book
    if (!this || !this.data_type || this.data_type != "book") {
      //console.log('renderBook rejects based on type');
      return false; // it will get rendered by the host
    }
    var $def = $.Deferred();
    store.fetchBook(slug).then(function(book) {
      var view = {};
      if (!pageNumber) {
        pageNumber = 1;
      } else {
        pageNumber = parseInt(pageNumber, 10);
      }
      view.frontPage = pageNumber === 1;
      view.title = book.title;
      view.ID = book.ID;
      var newContent;
      var N = book.pages.length;
      if (N == 0 || !book.pages[0]) {
        $def.reject();
        return;
      }
      if (pageNumber <= N) {
        view.author = book.author;
        view.pageNumber = pageNumber;
        view.backto = encodeURI(book.link);
        view.image = book.pages[Math.max(1, pageNumber - 1)];
        view.caption = view.image.text;
        if (pageNumber === 1) {
          view.backLink = state.get("findAnotherLink");
          view.nextLink = pageLink(book.link, pageNumber + 1);
        } else {
          view.backLink = pageLink(book.link, pageNumber - 1);
          view.nextLink = pageLink(book.link, pageNumber + 1);
        }
        templates.setImageSizes(view.image);
        newContent = templates.render("bookPage", view);
        /**
         * here seems to be where I would need to hook into the render logic to enable highlighting
         * I'm imagining something similar to how silence works; always highlight clear and pass the
         * audio  and text to a new function that would calculate a timeout and update the p.thr-text with
         * a span wrapped at about the right time
         *
         * i think i'll need to return the Audio element from the speech.js play function to make this work,
         * as the audio length doesn't seem to be available here
         *
         * something roughly like (please ignore the miss-mash of different languages):
         * highlight(audioLength, text) {
         *   wordcount = text.split(" ").length
         *   audioSplit = audioLength / wordcount
         *
         *   forEach word in text.split(" ") do
         *     setTimeout(()=>{
         *       $('p.thr-text').html("new p tag with correct word wrapped in span.highlighted")
         *       }, audioSplit * i)
         *   end
         * }
         *
         * this isn't an optinal strategy because some words take longer to say and I don't know
         * how the speech synthisis works with punctuation etc, but this seems like a reasonable first
         * guess.
         *
         * Another note: i'll need to get the highlight value (for right now just clear, or yellow) from the book
         * or user settings; still need to track that down.
        */
        speech.play(
          book.ID,
          pageNumber,
          book.language,
          book.pages[pageNumber - 1].text,
          book.bust
        );
      } else {
        if (pageNumber === N + 1) {
          logEvent("read", "complete", book.slug + ":" + book.ID);
        }
        view.nextLink = pageLink(book.link, pageNumber + 1);
        view.link = book.link;
        view.findLink = state.get("findAnotherLink");
        view.what = pageNumber === N + 1;
        view.rate = pageNumber === N + 2;
        view.thanks = pageNumber >= N + 3;
        if (view.thanks) {
          // we need to update the rating on the host
          updateRating(book, url);
        }
        view.rating = templates.rating_info(book.rating_value);
        newContent = templates.render("choicePage", view);
      }
      var $oldPage = page.getInactive("thr-book-page");
      // add classes to specific pages for styling purposes
      if (pageNumber === 1) {
        $oldPage.addClass("thr-colors front-page").removeClass("choice-page");
      } else if (pageNumber <= N) {
        $oldPage.addClass("thr-colors").removeClass("front-page choice-page");
      } else {
        $oldPage.addClass("thr-colors choice-page").removeClass("front-page");
      }
      $oldPage
        .empty()
        .append(bookHeading(pageNumber, book.ID))
        .append('<div class="content-wrap">' + newContent + "</div>");

      // size the pic box like last time, its probably the same
      $oldPage.find(".thr-pic-box").css(picBoxSize);

      $def.resolve($oldPage, {
        title: "Tar Heel Reader | " + book.title,
        colors: true
      });
    });
    return $def;
  }

  function bookHeading(pageNumber, ID) {
    var view = { noTitle: true };
    if (pageNumber === 1) {
      view.ID = ID;
      view.settings = true;
      view.isFavorite = state.isFavorite(ID);
    }
    return templates.render("heading", view);
  }

  function scalePicture($page) {
    var $box = $page.find(".thr-pic-box");
    if ($box.length === 0) return;

    var $window = $(window),
      $container = $page.find(".content-wrap"),
      ww = $container.width(),
      wh = $window.height(),
      b = $box.width(),
      bt = $box.offset().top,
      available,
      $caption = $page.find(".thr-caption-box"),
      ct,
      ch,
      gap;

    if ($caption.length === 1) {
      ct = $caption.offset().top;
      ch = $caption.height();
      gap = ct - bt - b;
      available = Math.min(ww, wh - bt - ch - 8);
    } else {
      available = Math.min(ww, wh - bt - 8);
    }
    picBoxSize = {
      width: available + "px",
      height: available + "px"
    };
    $box.css(picBoxSize);
  }

  // only resize when we're done instead of every 20ms
  $(window).on("resize", function() {
    if (this.resizeTO) {
      clearTimeout(this.resizeTO);
    }
    this.resizeTO = setTimeout(function() {
      $(this).trigger("resizeEnd");
    }, 50);
  });

  // resize book pictures when the window changes size
  $(window).on("resizeEnd", function(e) {
    var $page = $(".active-page.thr-book-page");
    if ($page.length === 1) {
      //console.log('book resize');
      scalePicture($page);
    }
  });

  function chooseOrPreviousPage() {
    if ($(".active-page .thr-choices").length > 0) {
      makeChoice();
    } else {
      previousPage();
    }
  }

  function nextChoiceOrPage() {
    if ($(".active-page .thr-choices").length > 0) {
      changeChoice(+1);
    } else {
      nextPage();
    }
  }

  function previousChoiceOrPage() {
    if ($(".active-page .thr-choices").length > 0) {
      changeChoice(-1);
    } else {
      previousPage();
    }
  }

  function makeChoice() {
    var choice = $(".active-page .thr-choices .selected a");
    if (choice.length == 1) {
      choice.click();
    } else {
      console.log("no choice", choice.length);
    }
  }

  function previousPage() {
    $(".active-page a.thr-back-link").click();
  }

  function nextPage() {
    $(".active-page a.thr-next-link").click();
  }

  function changeChoice(dir) {
    var choices = $(".active-page .thr-choices li");
    if (choices.length > 0) {
      var index = 0;
      var selected = choices.filter(".selected");
      if (selected.length > 0) {
        index = choices.index(selected);
        index += dir;
        if (index < 0) {
          index = choices.length - 1;
        } else if (index > choices.length - 1) {
          index = 0;
        }
      }
      choices.removeClass("selected");
      var $choice = $(choices.get(index));
      $choice.addClass("selected");
      var toSay = $choice.attr("data-speech");
      if (toSay) {
        speech.play("site", toSay, state.get("locale"));
      }
    } else {
      console.log("no choices");
    }
  }

  function keyChoice(e, name, code) {
    var selector = ".active-page .key-" + name;
    var link = $(selector);
    link.click();
  }

  function swipe(e, dx, dy) {
    //console.log('do swipe');
    if (dx < 0) {
      nextPage();
    } else {
      previousPage();
    }
  }

  function updateRating(book, url) {
    var ratingRE = /rating=([123])/;
    var m = ratingRE.exec(url);
    if (m && !state.offline()) {
      var rating = parseInt(m[1], 10);
      book.rating_count += 1;
      book.rating_total += rating;
      book.rating_value =
        Math.round((2.0 * book.rating_total) / book.rating_count) * 0.5;
      $.ajax({
        url: "/rateajax/",
        data: {
          id: book.ID,
          rating: rating
        }
      });
    }
  }

  $.subscribe("/read/chooseOrPreviousPage", chooseOrPreviousPage);
  $.subscribe("/read/nextChoiceOrPage", nextChoiceOrPage);
  $.subscribe("/read/previousChoiceOrPage", previousChoiceOrPage);
  $.subscribe("/read/makeChoice", makeChoice);
  $.subscribe("/read/key", keyChoice);
  $.subscribe("/read/swipe", swipe);

  // configure the keyboard controls
  keys.setMap(".active-page.thr-book-page", {
    "left enter pageup": "/read/chooseOrPreviousPage",
    "right space pagedown": "/read/nextChoiceOrPage",
    up: "/read/previousChoiceOrPage",
    down: "/read/makeChoice",
    "p n m c a r d 1 2 3": "/read/key",
    swipe: "/read/swipe"
  });

  // handle toggling favorites
  $(document).on("click", ".front-page .thr-favorites-icon", function(ev) {
    if (ios.cancelNav(ev)) {
      // prevent ios double click bug
      return false;
    }
    ev.preventDefault();
    var $page = $(".front-page.active-page"),
      id = $page.find(".content-wrap h1").attr("data-id");
    if (state.isFavorite(id)) {
      state.removeFavorite(id);
    } else {
      state.addFavorite(id);
    }
    $page.find("header").replaceWith(bookHeading(1, id));
  });

  var trackerSocket = null;
  var trackerQueue = [];

  function notifyTracker($page, slug, pageNumber) {
    // hack to try talking to Megan's tracker
    function pos($obj) {
      var o = $obj.offset(),
        p = $obj.outerHeight() - $obj.height(),
        y = Math.round(o.top) + p,
        x = Math.round(o.left),
        w = Math.round($obj.width()),
        h = Math.round($obj.height());
      console.log(x, y, w, h);
      return {
        t: y,
        l: x,
        r: x + w,
        b: y + h
      };
    }
    if (!trackerSocket || trackerSocket.readyState == 3) {
      trackerSocket = new WebSocket("ws://localhost:8008/");
      trackerSocket.onopen = function() {
        console.log("sending queued");
        while (trackerQueue.length > 0) {
          trackerSocket.send(trackerQueue.shift());
        }
      };
    }
    $(".thr-text")
      .contents()
      .wrap('<span class="thetext"></span>');
    var $text = $page.find("span.thetext"),
      choice = $page.is(".choice-page"),
      $pic = $page.find("img.thr-pic"),
      data = { page: pageNumber, slug: slug, choice: choice };

    if (!choice) {
      var c = pos($text),
        p = pos($pic),
        d = {
          tl: c.l,
          tr: c.r,
          tt: c.t,
          tb: c.b,
          pl: p.l,
          pr: p.r,
          pt: p.t,
          pb: p.b
        };
      $.extend(data, d);
    }
    console.log("data", data);
    var jdata = JSON.stringify(data);
    if (trackerSocket.readyState == 1) {
      console.log("sending");
      trackerSocket.send(jdata);
    } else {
      console.log("queueing");
      trackerQueue.push(jdata);
    }
    // end hack
  }

  function configureBook(url, slug, pageNumber) {
    if (!pageNumber) {
      pageNumber = 1;
    }
    // console.log('configureBook', url, slug, pageNumber);
    var $page = $(this);
    if (!$page.is(".thr-book-page")) {
      console.log("not book page, no configure");
    }
    scalePicture($page);
    $page.find(".thr-pic").fadeIn(200);
    var toSay = $page.find(".thr-question").attr("data-speech");
    if (toSay) {
      speech.play("site", toSay, state.get("locale"));
    }

    ios.focusVoiceOverOnText($page);

    if (state.get("eyetracker") == "1") {
      notifyTracker($page, slug, pageNumber);
    }

    // enable larger targets for eye gaze users
    var biglinks = +state.get("biglinks");
    if (biglinks) {
      var $window = $(window),
        $container = $page.find(".content-wrap"),
        ww = $container.width(),
        wh = $window.height(),
        fs = parseFloat($("body").css("fontSize")),
        target = fs * (0.9 + 3.6 * biglinks),
        top = 10 * fs,
        bar = wh - top,
        ptb = (bar - target) / 2;
      $("a.thr-next-link")
        .css({
          width: "initial",
          height: "initial",
          paddingTop: ptb + "px",
          paddingBottom: ptb + "px",
          paddingLeft: fs,
          paddingRight: fs,
          backgroundColor: "inherit",
          right: 0,
          bottom: 0
        })
        .find("img")
        .css("zoom", 2 * biglinks);
      $("a.thr-back-link")
        .css({
          width: "initial",
          height: "initial",
          paddingTop: ptb + "px",
          paddingBottom: ptb + "px",
          paddingLeft: fs,
          paddingRight: fs,
          backgroundColor: "inherit",
          left: 0,
          bottom: 0
        })
        .find("img")
        .css("zoom", 2 * biglinks);
      // remove the vertical scrollbar to allow the right boundary to help
      $("html").css("overflow-y", "auto");
    }
  }

  route.add(
    "render",
    /^\/\d+\/\d+\/\d+\/([^\/]+)\/(?:(\d+)\/)?(?:\?.*)?$/,
    renderBook
  );
  route.add("render", /^\/(?:\?(p=\d+))(?:&page=(\d+))?/, renderBook);
  route.add(
    "init",
    /^\/\d+\/\d+\/\d+\/([^\/]+)\/(?:(\d+)\/)?(?:\?.*)?$/,
    configureBook
  );
  route.add("init", /^\/(?:\?p=.*)$/, configureBook);

  return {};
});

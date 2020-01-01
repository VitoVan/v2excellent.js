// ==UserScript==
// @name           V2EXcellent.js
// @namespace      http://vitovan.github.io/v2excellent.js/
// @version        1.1.5
// @description    A Better V2EX
// @author         VitoVan
// @include        http*://*v2ex.com/*
// @require //code.jquery.com/jquery-1.12.4.min.js
// @grant          none
// ==/UserScript==

$('document').ready(function() {
  window.loaded = true;
});

var POST_PROCESS_FUNCS = [
  function done() {
    console.log('V2EXcellented!');
  },
];

// 图片链接自动转换成图片 代码来自caoyue@v2ex
POST_PROCESS_FUNCS.push(function linksToImgs() {
  var links = document.links;
  for (var x in links) {
    var link = links[x];
    if (
      /^http.*\.(?:jpg|jpeg|jpe|bmp|png|gif)/i.test(link.href) &&
      !/<img\s/i.test(link.innerHTML)
    ) {
      link.innerHTML =
        "<img title='" + link.href + "' src='" + link.href + "' />";
    }
  }
});

POST_PROCESS_FUNCS.push(function markOp() {
  //标记楼主
  uid = document
    .getElementById('Rightbar')
    .getElementsByTagName('a')[0]
    .href.split('/member/')[1]; //自己用户名
  if (location.href.indexOf('.com/t/') != -1) {
    var lzname = document
      .getElementById('Main')
      .getElementsByClassName('avatar')[0]
      .parentNode.href.split('/member/')[1];
    allname = '@' + lzname + ' ';
    all_elem = document.getElementsByClassName('dark');
    for (var i = 0; i < all_elem.length; i++) {
      if (all_elem[i].innerHTML == lzname) {
        var opWord = language === 'zh_CN' ? '楼主' : 'OP';
        all_elem[i].innerHTML += ' <font color=green>[' + opWord + ']</font>';
      }
      //为回复所有人做准备
      if (
        uid != all_elem[i].innerHTML &&
        all_elem[i].href.indexOf('/member/') != -1 &&
        all_elem[i].innerText == all_elem[i].innerHTML &&
        allname.indexOf('@' + all_elem[i].innerHTML + ' ') == -1
      ) {
        allname += '@' + all_elem[i].innerHTML + ' ';
      }
    }
  }
});

function postProcess() {
  $(POST_PROCESS_FUNCS).each(function(i, f) {
    if (typeof f === 'function') {
      f();
      console.log('V2EXcellent Post Processing: ' + f.name);
    }
  });
}

var language = window.navigator.userLanguage || window.navigator.language;

var currentLocation = location.href;
//If this is the thread page
if (currentLocation.match(/\/t\/\d+/g)) {
  //Enable Reply Directly Feature
  $('div.topic_buttons').append(
    '<a " href="#;" onclick="$(\'#reply_content\').focus();" class="tb">回复</a>'
  );
  //Enable Img Uploader Feature
  enableUploadImg();
  var comments = [];
  //loading
  showSpinner();
  //Get comments from current page
  fillComments($('body'));
  //Get other pages comments
  var CURRENT_PAGE_URLS = [];
  $('a[href].page_normal').each(function(i, o) {
    if (CURRENT_PAGE_URLS.indexOf(o.href) === -1) {
      CURRENT_PAGE_URLS.push(o.href);
    }
  });
  var LEFT_PAGES_COUNT = CURRENT_PAGE_URLS.length;
  var CURRENT_PAGE = 0;
  var DOMS = [$(document)];
  if (LEFT_PAGES_COUNT > 0) {
    $(CURRENT_PAGE_URLS).each(function(i, o) {
      $.get(o, function(result) {
        var resultDom = $('<output>').append($.parseHTML(result));
        DOMS.push(resultDom);
        fillComments(resultDom);
        CURRENT_PAGE++;
        //if all comments are sucked.
        if (CURRENT_PAGE === LEFT_PAGES_COUNT) {
          //stack'em
          stackComments();
          //reArrange
          reArrangeComments();
          // post process functions
          postProcess();
        }
      });
    });
  } else {
    stackComments();
    //reArrange
    reArrangeComments();
    // post process functions
    postProcess();
  }
  // Clear Default Pager
  $('a[href^="?p="]')
    .parents('div.cell')
    .remove();
} else if (currentLocation.match(/\/new/)) {
  $(
    '<a href="https://imgur.com/upload" target="_blank" style="padding:0 5px;">上传图片</a>'
  ).insertAfter($('button[onclick="previewTopic();"]'));
}

function jumpToReply() {
  var floorSpecArr = currentLocation.match(/#reply\d+/g);
  var floorSpec = floorSpecArr && floorSpecArr.length ? floorSpecArr[0] : false;
  if (floorSpec) {
    floorSpec = floorSpec.match(/\d+/g)[0];
    var specFloor = $('span.no').filter(function() {
      return $(this).text() === floorSpec;
    });
    var scrollFunc = function() {
      window.scrollTo(0, specFloor.offset().top - $('body').offset().top);
    };
    if (window.loaded) {
      scrollFunc();
    } else {
      window.onload = function() {
        setTimeout(function() {
          scrollFunc();
        }, 1);
      };
    }
  }
}

//Remove #reply42 from index
$('span.item_title>a').attr('href', function(i, val) {
  return val.replace(/#reply\d+/g, '');
});

function fillComments(jqDom) {
  jqDom.find('div[id^="r_"]').each(function(i, o) {
    var cmno = parseInt(
      $(o)
        .find('span.no')
        .text()
    );
    comments[cmno] = {
      id: $(o).attr('id'),
      no: cmno,
      user: $(o)
        .find('strong>a')
        .text(),
      content: $(o)
        .find('div.reply_content')
        .text(),
      mentioned: (function() {
        var mentionedNames = [];
        $(o)
          .find('div.reply_content>a[href^="/member/"]:not("dark")')
          .each(function(i, o) {
            mentionedNames.push(o.innerHTML);
          });
        return mentionedNames;
      })(),
      subComments: [],
    };
  });
}

//Enable Floor Specification Feature
$('a[href="#;"]:has(img[alt="Reply"])').click(function(e) {
  var floorNo = $(e.currentTarget)
    .parent()
    .find('span.no')
    .text();
  replyContent = $('#reply_content');
  oldContent = replyContent.val().replace(/^#\d+ /g, '');
  postfix = ' ' + '#' + floorNo + ' ';
  newContent = '';
  if (oldContent.length > 0) {
    if (oldContent != postfix) {
      newContent = oldContent + postfix;
    }
  } else {
    newContent = postfix;
  }
  replyContent.focus();
  replyContent.val(newContent);
  moveEnd($('#reply_content'));
});

//Enable Gift ClickOnce Feature
$('a[href="/mission/daily"]')
  .attr('id', 'gift_v2excellent')
  .attr('href', '#')
  .click(function() {
    $('#gift_v2excellent').text('正在领取......');
    $.get('/mission/daily', function(result) {
      var giftLink = $('<output>')
        .append($.parseHTML(result))
        .find('input[value^="领取"]')
        .attr('onclick')
        .match(/\/mission\/daily\/redeem\?once=\d+/g)[0];
      $.get(giftLink, function(checkResult) {
        var okSign = $('<output>')
          .append($.parseHTML(checkResult))
          .find('li.fa.fa-ok-sign');
        if (okSign.length > 0) {
          $.get('/balance', function(result) {
            var amount = $('<output>')
              .append($.parseHTML(result))
              .find('table>tbody>tr:contains("每日登录"):first>td:nth(2)')
              .text();
            $('#gift_v2excellent').html(
              '已领取 <strong>' + amount + '</strong> 铜币。'
            );
            setTimeout(function() {
              $('#Rightbar>.sep20:nth(1)').remove();
              $('#Rightbar>.box:nth(1)').remove();
            }, 2000);
          });
        }
      });
    });
    return false;
  });

//Get comment's parent
function findParentComment(comment) {
  var parent;
  if (comment) {
    var floorRegex = comment.content.match(/#\d+ /g);
    if (floorRegex && floorRegex.length > 0) {
      var floorNo = parseInt(floorRegex[0].match(/\d+/g)[0]);
      parent = comments[floorNo];
    } else {
      for (var i = comment.no - 1; i > 0; i--) {
        var cc = comments[i];
        if (cc) {
          if (
            $.inArray(cc.user, comment.mentioned) !== -1 &&
            parent === undefined
          ) {
            parent = cc;
          }
          //If they have conversation, then make them together.
          if (
            comment.mentioned.length > 0 &&
            cc.user === comment.mentioned[0] &&
            cc.mentioned[0] === comment.user
          ) {
            parent = cc;
            break;
          }
        }
      }
    }
  }
  return parent;
}

//Stack comments, make it a tree
function stackComments() {
  for (var i = comments.length - 1; i > 0; i--) {
    var parent = findParentComment(comments[i]);
    if (parent) {
      parent.subComments.unshift(comments[i]);
      comments.splice(i, 1);
    }
  }
}

function getCommentDom(id) {
  var commentDom;
  $.each(DOMS, function(i, o) {
    var result = o.find('div[id="' + id + '"]');
    if (result.length > 0) {
      commentDom = result;
    }
  });
  return commentDom;
}

function moveComment(comment, parent) {
  if (comment) {
    var commentDom = getCommentDom(comment.id);
    $.each(comment.subComments, function(i, o) {
      moveComment(o, commentDom);
    });
    commentDom.appendTo(parent);
  }
}

function getCommentBox() {
  var commentBox = $('#Main>div.box:nth(1)');
  if (commentBox.length === 0) {
    // Maybe using mobile
    commentBox = $('#Wrapper>div.content>div.box:nth(1)');
    if ($('#v2excellent-mobile-tip').length === 0) {
      $(
        '<div class="cell" id="v2excellent-mobile-tip" style="background: #CC0000;font-weight: bold;text-align: center;"><span><a style="color:white;text-decoration:underline;" target="_blank" href="https://github.com/VitoVan/v2excellent.js/issues/7#issuecomment-304674654">About V2EXcellent.js on Mobile</a></span></div>'
      ).insertBefore('#Wrapper>div.content>div.box:nth(1)>.cell:first');
    }
  }
  return commentBox;
}

function showSpinner() {
  var commentBox = getCommentBox();
  $('body').append(
    '<style>.spinner{width:40px;height:40px;position:relative;margin:100px auto}.double-bounce1,.double-bounce2{width:100%;height:100%;border-radius:50%;background-color:#333;opacity:.6;position:absolute;top:0;left:0;-webkit-animation:sk-bounce 2.0s infinite ease-in-out;animation:sk-bounce 2.0s infinite ease-in-out}.double-bounce2{-webkit-animation-delay:-1.0s;animation-delay:-1.0s}@-webkit-keyframes sk-bounce{0%,100%{-webkit-transform:scale(0.0)}50%{-webkit-transform:scale(1.0)}}@keyframes sk-bounce{0%,100%{transform:scale(0.0);-webkit-transform:scale(0.0)}50%{transform:scale(1.0);-webkit-transform:scale(1.0)}}</style>'
  );
  $(
    '<div class="spinner"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>'
  ).insertBefore(commentBox);
  commentBox.hide();
}

function reArrangeComments() {
  $('div.inner:has(a[href^="/t/"].page_normal)').remove();
  var commentBox = getCommentBox();
  $.each(comments, function(i, o) {
    moveComment(o, commentBox);
  });
  $('div[id^="r_"]>table>tbody>tr>td:first-child').attr('width', '20');
  $('body').append(
    '<style>.cell{background-color: inherit;}.cell .cell{padding-bottom:0;border-bottom:none;min-width: 250px;padding-right:0;}div[id^="r_"] img.avatar{width:20px;height:20px;border-radius:50%;}div[id^="r_"]>div{margin-left: 5px;}</style>'
  );
  commentBox.show();
  //removeSpinner
  $('.spinner').remove();
  jumpToReply();
}

function enableUploadImg() {
  $('div.cell:contains("添加一条新回复")').append(
    '<div class="fr"><a href="https://imgur.com/upload" target="_blank"> 上传图片</a> - </div>'
  );
}

// ==UserScript==
// @name           V2EXcellent.js
// @namespace      http://vitovan.github.io/v2excellent.js/
// @version        0.1.0.9
// @description    A Better V2EX
// @author         VitoVan
// @include        http*://*v2ex.com/*
// @grant          none
// ==/UserScript==

var currentLocation = location.href;
//If this is the thread page
if(currentLocation.match(/\/t\/\d+/g)){
    // Clear Default Pager
    $('a[href^="?p="]').parents('div.cell').remove();
    //Enable Reply Directly Feature
    $('div.topic_buttons').append('<a " href="#;" onclick="$(\'#reply_content\').focus();" class="tb">回复</a>');
    //Enable Img Uploader Feature
    enableUploadImg();
    var comments = [];
    //loading
    showSpinner();
    //Get comments from current page
    fillComments($('body'));
    //Get other pages comments
    var PAGES_COUNT = $('div.inner>a[href^="/t/"].page_normal').length;
    var CURRENT_PAGE = 0;
    var DOMS = [$(document)];
    if(PAGES_COUNT>0){
        $('div.inner>a[href^="/t/"].page_normal').each(function(i,o){
            $.get(o.href,function(result){
                var resultDom = $('<output>').append($.parseHTML(result));
                DOMS.push(resultDom);
                fillComments(resultDom);
                CURRENT_PAGE ++;
                //if all comments are sucked.
                if(CURRENT_PAGE === PAGES_COUNT){
                    //stack'em
                    stackComments();
                    //reArrange
                    reArrangeComments();
                }
            });
        });
    }else{
        stackComments();
        //reArrange
        reArrangeComments();
    }
}else if(currentLocation.match(/\/new/)){
    $('<a href="http://upload.otar.im/" target="_blank" style="padding:0 5px;">上传图片</a>').insertAfter($('button[onclick="previewTopic();"]'))    
}

function jumpToReply(){
    var floorSpecArr = currentLocation.match(/#reply\d+/g);
    var floorSpec = floorSpecArr && floorSpecArr.length ? floorSpecArr[0] : false;
    if(floorSpec){
        floorSpec = floorSpec.match(/\d+/g)[0];
        var specFloor = $('span.no').filter(function() {return $(this).text() === floorSpec;});
        $('body').scrollTop(specFloor.offset().top - $('body').offset().top);
    }
}

//Remove #reply42 from index
$('span.item_title>a').attr("href",function(i,val){return val.replace(/#reply\d+/g,'');});

function fillComments(jqDom){
    jqDom.find('div[id^="r_"]').each(function(i,o){
        var cmno = parseInt($(o).find('span.no').text());
        comments[cmno] =
            {
                id: $(o).attr('id'),
                no: cmno,
                user: $(o).find('strong>a').text(),
                content: $(o).find('div.reply_content').text(),
                mentioned: (function(){
                    var mentionedNames = [];
                    $(o).find('div.reply_content>a[href^="/member/"]:not("dark")').each(function(i,o){
                        mentionedNames.push(o.innerHTML);
                    });
                    return mentionedNames;
                }()),
                subComments: []
            };
    });
}

//Enable Floor Specification Feature
$('a[href="#;"]:has(img[alt="Reply"])').click(function(e){
    var floorNo = $(e.currentTarget).parent().find('span.no').text();
    replyContent = $("#reply_content");
	oldContent = replyContent.val().replace(/^r#\d+ /g,'');
	prefix = "r#" + floorNo + " ";
	newContent = ''
	if(oldContent.length > 0){
	    if (oldContent != prefix) {
	        newContent = prefix  + oldContent;
	    }
	} else {
	    newContent = prefix
	}
	replyContent.focus();
	replyContent.val(newContent);
	moveEnd($("#reply_content"));
});

//Enable Gift ClickOnce Feature
$('a[href="/mission/daily"]').attr('id','gift_v2excellent').attr('href','#').click(function(){
    $('#gift_v2excellent').text('正在领取......');
    $.get('/mission/daily',function(result){
        var giftLink = $('<output>').append($.parseHTML(result)).
            find('input[value^="领取"]').
            attr('onclick').match(/\/mission\/daily\/redeem\?once=\d+/g)[0];
        $.get(giftLink,function(checkResult){
            var okSign = $('<output>').append($.parseHTML(checkResult)).find('li.fa.fa-ok-sign');
            if(okSign.length>0){
                $.get('/balance',function(result){
                    var amount = $('<output>').append($.parseHTML(result)).find('table>tbody>tr:contains("每日登录"):first>td:nth(2)').text();
                    $('#gift_v2excellent').html('已领取 <strong>' + amount + '</strong> 铜币。' );
                    setTimeout(function(){
                        $('#Rightbar>.sep20:nth(1)').remove();
                        $('#Rightbar>.box:nth(1)').remove();
                    },2000);
                });
            }
        });
    });
    return false;
});

//Get comment's parent
function findParentComment(comment){
    var parent = undefined;
    if(comment){
        var floorRegex = comment.content.match(/^r#\d+ /g);
        if(floorRegex && floorRegex.length>0){
            var floorNo = parseInt(floorRegex[0].match(/\d+/g)[0]);
            parent = comments[floorNo];
        }else{
            for(var i=comment.no-1;i>0;i--){
                var cc = comments[i];
                if(cc){
                    if($.inArray(cc.user, comment.mentioned) !== -1 && parent === undefined){
                        parent = cc;
                    }
                    //If they have conversation, then make them together.
                    if(comment.mentioned.length>0 && cc.user === comment.mentioned[0] && cc.mentioned[0] === comment.user){
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
function stackComments(){
    for(var i=comments.length-1;i>0;i--){
        var parent = findParentComment(comments[i]);
        if(parent){
            parent.subComments.unshift(comments[i]);
            comments.splice(i,1);
        }
    }
}

function getCommentDom(id){
    var commentDom = undefined;
    $.each(DOMS,function(i,o){
        var result = o.find('div[id="' + id + '"]');
        if(result.length>0){
            commentDom = result;
        }
    });
    return commentDom;
}

function moveComment(comment,parent){
    if(comment){
        var commentDom = getCommentDom(comment.id);
        $.each(comment.subComments,function(i,o){
            moveComment(o,commentDom);
        });
        commentDom.appendTo(parent);
    }
}

function showSpinner(){
    var commentBox = $('#Main>div.box:nth(1)');
    $('body').append('<style>.spinner{width:40px;height:40px;position:relative;margin:100px auto}.double-bounce1,.double-bounce2{width:100%;height:100%;border-radius:50%;background-color:#333;opacity:.6;position:absolute;top:0;left:0;-webkit-animation:sk-bounce 2.0s infinite ease-in-out;animation:sk-bounce 2.0s infinite ease-in-out}.double-bounce2{-webkit-animation-delay:-1.0s;animation-delay:-1.0s}@-webkit-keyframes sk-bounce{0%,100%{-webkit-transform:scale(0.0)}50%{-webkit-transform:scale(1.0)}}@keyframes sk-bounce{0%,100%{transform:scale(0.0);-webkit-transform:scale(0.0)}50%{transform:scale(1.0);-webkit-transform:scale(1.0)}}</style>');
    $('<div class="spinner"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>').insertBefore(commentBox);
    commentBox.hide();
}

function reArrangeComments(){
    $('div.inner:has(a[href^="/t/"].page_normal)').remove();
    var commentBox = $('#Main>div.box:nth(1)');
    $.each(comments,function(i,o){
        moveComment(o,commentBox);
    });
    $('div[id^="r_"]>table>tbody>tr>td:first-child').attr('width','20');
    $('body').append('<style>.cell .cell{border-bottom:none;}div[id^="r_"] img.avatar{width:20px;height:20px;border-radius:50%;}div[id^="r_"]>div{margin-left: 5px;}</style>');
    commentBox.show();
    //removeSpinner
    $('.spinner').remove();
    jumpToReply();
}

function enableUploadImg(){
    $('div.cell:contains("添加一条新回复")').append('<div class="fr"><a href="http://upload.otar.im/" target="_blank"> 上传图片</a> - </div>');
}

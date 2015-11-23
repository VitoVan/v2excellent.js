var comments = [];
function fillComments(jqDom){
    jqDom.find('div[id^="r_"]').each(function(i,o){
        var cmno = parseInt($(o).find('span.no').text());
        comments[cmno] =
            {
                no: cmno,
                user: $(o).find('strong>a').text(),
                content: $(o).find('div.reply_content').text(),
                mentioned: (function(){
                    var mentionedNames = [];
                    $(o).find('div.reply_content>a[href^="/member/"]:not("dark")').each(function(i,o){
                        mentionedNames.push(o.innerHTML);
                    });
                    return mentionedNames;
                }())
            };
    });
}

//Get comments from current page
fillComments($('body'));

//Get other pages comments
$('div.inner>a[href^="/t/"].page_normal').each(function(i,o){
    $.get(o.href,function(result){
        var resultDom = $('<output>').append($.parseHTML(result));
        fillComments(resultDom);
    });
});

//Get root comments
function findRootComments(){
    var rootComments = [];
    for(var i=1,l=comments.length;i<comments.length;i++){
        var cc = comments[i];
        if(cc.mentioned.length === 0){
            rootComments.push(cc);
        }
    }
    return rootComments;
}

//Get sub comments
function findSubComments(comment){
    var subComments = [];
    //To say, if a user commented on the board after he/she is mentioned, if he/she did, this may raise a new conversation.
    var USER_RECOMMENTED = false;
    for(var i=comment.no+1,l=comments.length;i<comments.length;i++){
        var cc = comments[i];
        if(comment.user === cc.user){
            USER_RECOMMENTED = true;
        }
        //If a user raised a new conversation, then we won't follow this comment anymore
        if(USER_RECOMMENTED === true){
            //We only need to find the comment which mentioned each other
            if($.inArray(cc.user,comment.mentioned) !== -1 && $.inArray(comment.user,cc.mentioned) !== -1){
                subComments.push(cc);
                //Then break
                break;
            }
        }else{
            if($.inArray(comment.user,cc.mentioned) !== -1){
                subComments.push(cc);
            }
        }
    }
    return subComments;
}

//Get sub comments, recursively
function findSubCommentsR(comment){
    var subComments = findSubComments(comment);
    comment.subComments = subComments;
    $.each(subComments, function(i, o){
        findSubCommentsR(o);
    });
    return comment;
}

//Gen comments tree
function genTree(){
    var tree = [];
    $.each(findRootComments(),function(i,o){
        tree.push(findSubCommentsR(o));
    });
    return tree;
}

//Print Comment
function printComment(comment,gap){
    console.log(gap + comment.no + ' - ' + comment.user + ' - ' + comment.content);
}

//Print Comment, recursively
function printCommentR(comment,gap){
    if(!gap){gap='--';}
    printComment(comment,gap);
    gap += '--';
    $.each(comment.subComments,function(i,o){
        printCommentR(o,gap);
    });
}

//Print Tree
function printTree(tree){
    
}

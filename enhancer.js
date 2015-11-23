// --------------------------- Comments Enhancement -----------------------------
$('body').append('<style>reply_stack:before{content: "^";font-size: 9px;line-height: 9px;font-weight: 500;border-radius: 10px;display: inline-block;background-color: #f0f0f0;color: #ccc;padding: 2px 5px 2px 5px;float: right;width: 10px;text-align: center;}reply_stack{display:none;}reply_stack.shown{display: block !important;background: #000;border-radius: 3px;padding: 5px 5px 5px 14px;color: #E2E2E2;}reply_stack.shown:before {display: none;}</style>');
var reply_stack = $(document.createElement('reply_stack'));
reply_stack.on('mouseenter click touchend',function(e){
    if($(e.currentTarget).hasClass('shown')){
        return;
    }
    var parentMessages = [];
    $(e.currentTarget).parent().find('a[href^="/member"]').not('.dark').each(function(i,o){
        $(e.currentTarget).append(o.innerHTML + ': ' +
                                  $('div[id^="r_"]:has(a[href="/member/' + o.innerHTML + '"].dark):last').find('div.reply_content').text() + '<br>');
        $(e.currentTarget).addClass('shown');
        parentMessages.push({
            user: o.innerHTML,
            content: $('div[id^="r_"]:has(a[href="/member/' + o.innerHTML + '"].dark):last').find('div.reply_content').text()});
    });
    console.log(parentMessages);
});
$('div.reply_content:has(a[href^="/member/"])').append(reply_stack);
$('div[id^="r_"]').on('mouseenter click touchend',function(e){
    $(e.currentTarget).find('reply_stack').show();
});
$('div[id^="r_"]').mouseleave(function(e){
    var rs = $(e.currentTarget).find('reply_stack');
    if(!rs.hasClass('shown')){
        rs.hide();
    }
});

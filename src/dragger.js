/**
 * @author mengke
 * @date 2013-1-23
 * dragger组件,仅对支持html5的dragable有效，不支持，则使用点击模拟
 * @depends tangram1.5
 * @construct
 * @param {object} opt 参数
 * opt.src {string} 源dom元素id
 * opt.dest {string} 目的dom元素id
 * opt.direction 方向 , @see Dragger.DIRECTION
 * opt.ondrop {fn} 形如：function(element, direction)
 * * */

var Dragger = function (opt) {
    
    //拖动方向
    var DIRECTION = Dragger.DIRECTION;
    var self = this;
    var options = {
        src : '',
        dest : '',
        direction : DIRECTION.both, //0 src->dest, 1 dest->src 2 双向
        ondrop : new Function
    };
    var ctl_src, ctl_dest, cur_drag_element;
    
    baidu.extend(options, opt);
    
    function dragStart(ev) {
        var target = ev.target;
        if(ctl_src == target.parentNode || ctl_dest == target.parentNode) {
            cur_drag_element = target;
            ev.dataTransfer.effectAllowed = 'move';
            return true;
        }
        return false;
    }
    
    function dragEnter(ev) {
        ev.preventDefault();
        return true;
    }
    
    function dragOver(ev) {
        return false;
    }
    
    function dragDrop(ev) {
        var src = cur_drag_element;
        var target = ev.target;
        if (!src || ctl_src != target && ctl_dest != target) {
            return false;
        }
        cur_drag_element  = null;
        //通知
        var direction = ctl_src == src.parentNode ? DIRECTION.src2dest : DIRECTION.dest2src ;
        if(false !== options.ondrop(src, direction)) {
            ev.target.appendChild(src);
        }
        ev.stopPropagation();
        return false;
    }
    
    function bindDragable (elements) {
        baidu.array.each(elements, function (item) {
            item.draggable = true;
            item.ondragstart = dragStart;
        });
    }
    
    function unbindDragable (elements) {
        baidu.array.each(elements, function (item) {
            item.draggable = false;
            item.ondragstart = null;
        });
    }
    
    //初始化不支持dragable的版本
    function initNotSupport() {
        var src = baidu.g(options.src);
        var dest = baidu.g(options.dest);
        src.onclick = function(e) {
            var target = e.target;
            if(src == target.parentNode || src == (target = target.parentNode).parentNode) {
                if(false !== options.ondrop(target, DIRECTION.src2dest)) {
                    dest.appendChild(target);
                }
            }
        }
        
        if(DIRECTION.both == options.direction){
            dest.onclick = function(e) {
                var target = e.target;
                if(dest == target.parentNode || dest == (target = target.parentNode).parentNode) {
                    if(false !== options.ondrop(target, DIRECTION.dest2src)) {
                        src.appendChild(target);
                    }
                }
            }
        }
        
        return self;
    }
    
    function disposeNotSupport(){
        baidu.g(options.src).onclick = null;
        baidu.g(options.dest).onclick = null;
    }
    
    
    function init() {
        var src = baidu.g(options.src);
        var dest = baidu.g(options.dest);
        
        src.ondragenter = dragEnter;
        dest.ondrop = dragDrop;
        dest.ondragover = dragOver;
        bindDragable (src.children);

        if(DIRECTION.both == options.direction){
            src.ondrop = dragDrop;
            src.ondragover = dragOver;
            dest.ondragenter = dragEnter;
            bindDragable (dest.children);
        }
        
        ctl_src = src;
        ctl_dest = dest;
        return self;
    }
    
    function dispose() {
        baidu.each(['ondragenter', 'ondrop', 'ondragenter'], function(fn) {
            ctl_src[fn] = ctl_dest[fn] = null;
        });
        unbindDragable(ctl_src.children);
        unbindDragable(ctl_dest.children);
        ctl_src = null;
        ctl_dest = null;
    }
    
    if(9 >= baidu.ie) {
        this.dispose = disposeNotSupport;
        return initNotSupport();
    }
    else{
        this.dispose = dispose;
        return init();
    }
};

/**
 * dragger的拖动方向 
 */
Dragger.DIRECTION = {
    src2dest : 0, //src drag 到 dest
    dest2src : 1, // dest drag 到  src ,仅用于发送事件, 不做参数传递
    both : 2 //双向drag
};
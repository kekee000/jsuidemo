/*
 * @auther mengke
 * @date 2012-11-16
 * @interface:
 *    MODE_DZ       : dz 颜色版
 *    MODE_DW       : dw 颜色版
 *    pick()        : 拾取颜色,参数:adjElement,x,y
 *    setMode()     : 颜色版模式[dz,dw]
 *    setColor()    : 设置拾取颜色
 *    getColor()    : 获得最近一次拾取的颜色
 *    hide()        ：关闭
 *    onPick        ：拾取颜色之后动作
 *    onMove        ：拾取颜色时候的动作
 */
var ColorPicker = function(doc){
    var curFiller, //当前的填充器对象
        selected, //当前选中的颜色
        curEle, //当前的需要填充的element
        inited = 0, //是否初始化
        visible = 0, //是否可见
        ctx, //canvas的graph对象
        canvas, //canvas
        dp, //ColorPickerPanel 元素
        dv, //ColorPickerValue 元素
        ds, //ColorPickerSelected 元素
        radius = 8, //色板的大小
        hexch = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'], //hex数组
        usual = ['F0F','0FF','FF0','00F','0F0','F00','FFF','CCC','999','666','333','000']; //常用颜色
        
    function ToHex(n) {
        var h, l;
        n = Math.round(n);
        l = n % 16;
        h = Math.floor((n / 16)) % 16;
        return (hexch[h] + hexch[l]);
    }
    
    //定义填充器
    var filler = {
        //discuz风格的颜色面板
        'dz':{
            width:30,
            height:16,
            fill:function(ctx){
                        var i,j,r,g,b,cnum = new Array(1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0);
                        for( i = 0; i < 16; i ++){
                            for( j = 0; j < 30; j ++){
                                n1 = j % 5;
                                n2 = Math.floor(j / 5) * 3;
                                n3 = n2 + 3;
                                r = cnum[n3] * n1 + cnum[n2] * (5 - n1);
                                g = cnum[n3 + 1] * n1 + cnum[n2 + 1] * (5 - n1);
                                b = cnum[n3 + 2] * n1 + cnum[n2 + 2] * (5 - n1);
                                r = ((r * 16 + r) * 3 * (15 - i) + 0x80 * i) / 15;
                                g = ((g * 16 + g) * 3 * (15 - i) + 0x80 * i) / 15;
                                b = ((b * 16 + b) * 3 * (15 - i) + 0x80 * i) / 15;
                                ctx.fillStyle='#' + ToHex(r) + ToHex(g) + ToHex(b);
                                ctx.fillRect(j * radius, i * radius, radius, radius);
                            }
                        }
                        for(i = 0; i < 30; i++){
                            ctx.fillStyle='#' + usual[i];
                            ctx.fillRect(i * radius, 15 * radius, radius, radius);
                        }
                }
            },
        //Dreamweaver风格的颜色面板
        'dw':{
            width:20,
            height:12,
            fill : function (ctx){
                var i,j,r,g,b,c;
                for(j = 0; j < 12; j++){
                    for(i = 0; i < 18; i++){
                        r = Math.floor(i / 6 ) * 3 + Math.floor(j / 6 ) * 9;
                        g = Math.floor(i % 6) * 3;
                        b = Math.floor(j % 6) * 3;
                        c = '#' + hexch[r] + hexch[g] + hexch[b];
                        ctx.fillStyle = c;
                        ctx.fillRect(i*radius,j*radius,radius,radius);
                    }
                }
                for(i = 0; i < 12; i++){
                    ctx.fillStyle = '#' + usual[i];
                    ctx.fillRect(18 * radius,i * radius,radius,radius);
                    ctx.fillStyle = '#000';
                    ctx.fillRect(19 * radius,i * radius,radius,radius);
                }
            }
        }
    }
    
    //根据rgb获取颜色在色板上的位置
    function getpos(r,g,b){
        var i,j;
        for ( i = 0; i < curFiller.width; i++) {
            for ( j = 0; j < curFiller.height; j++) {
                pix = ctx.getImageData(i * radius, j * radius, 1, 1).data;
                if (pix[0] == r && pix[1] == g && pix[2] == b) {
                    return {
                        'x' : i * radius,
                        'y' : j * radius
                    };
                }
            }
        }
        return false;
    }
    
    //根据color获得rgb的值, FFFFFF => 255,255,255
    function getrgb(color){
      return {
          r : parseInt( color.slice( 1, 3 ) , 16),
          g : parseInt( color.slice( 3, 5 ) , 16),
          b : parseInt( color.slice( 5, 7 ) , 16)
      }
    }
    
    //在色板上设置选中的color
    function setcolor(color){
        var rgb = getrgb( color );
        var pos = getpos(rgb.r, rgb.g, rgb.b);
        if (pos) {
            ds.style.left = pos.x + 'px';
            ds.style.top = pos.y + 'px';
            selected = color;
        }
    }
    
    //根据相对元素e获得其 在屏幕中的left，top
    function getpoppos(e){
        var x = 0, y = e.offsetHeight;
        while (e) {
            x += e.offsetLeft;
            y += e.offsetTop;
            e = e.offsetParent;
        }
        return {
            'x' : x,
            'y' : y
        };
    }
    
    //初始化和绑定事件
    function init(){
        curFiller = filler['dw'];
        var width = curFiller.width * radius, height = curFiller.height * radius;
        var html = ['<canvas id="ColorPickerCanvas" style="position:relative"></canvas>', '<div id="ColorPickerValue" style="position:absolute;padding:1px;width:44px;font:10px/12px normal Arial; background:#FFF; border:#666 1px solid;left:-100px;top:0px"></div>', '<div id="ColorPickerSelected" style="position:absolute;left:-100px;width:' + (radius - 2) + 'px; height:' + (radius - 2) + 'px; border:#000 1px solid"></div>'].join('');

        var fragment = doc.createElement('div');
        fragment.id = 'ColorPickerPanel';
        fragment.style.cssText = 'position:absolute;left:-1000px; width:' + width + 'px;height:' + height + 'px;border:#000 1px solid;cursor:pointer;overflow:hidden;z-index:10000';
        fragment.innerHTML = html;
        doc.body.appendChild(fragment);

        canvas = doc.getElementById('ColorPickerCanvas');
        ctx = canvas.getContext('2d');
        dp = doc.getElementById('ColorPickerPanel');
        dv = doc.getElementById('ColorPickerValue');
        ds = doc.getElementById('ColorPickerSelected');

        canvas.onmousemove = function(ctx, dv) {
            return function(e) {
                var x = e.layerX, y = e.layerY, pix = ctx.getImageData(x, y, 1, 1).data;
                var r = pix[0], g = pix[1], b = pix[2], rgb = '#' + ToHex(r) + ToHex(g) + ToHex(b);
                dv.innerHTML = rgb;
                dv.style.left = x < radius * curFiller.width / 2 ? (radius * curFiller.width - 50) + 'px' : '0px';
                picker.onMove && picker.onMove(rgb, curEle);
            }
        }(ctx, dv);

        canvas.onclick = function(ctx, ds) {
            return function(e) {
                var x = e.layerX, y = e.layerY, pix = ctx.getImageData(x, y, 1, 1).data;
                var r = pix[0], g = pix[1], b = pix[2];
                selected = '#' + ToHex(r) + ToHex(g) + ToHex(b);
                ds.style.left = Math.floor(x / radius) * radius + 'px';
                ds.style.top = Math.floor(y / radius) * radius + 'px';
                picker.onPick && picker.onPick(selected, curEle);
                if (curEle) {
                    'value' in curEle ? curEle.value = selected : 0;
                    hide();
                }
            };
        }(ctx, ds);
        
        canvas.oncontextmenu = function() {
            changeMode(curFiller === filler['dz'] ? 'dw' : 'dz');
            return false;
        }
        
        curFiller.fill(ctx);
        inited = 1; 
    }

    //更改绘制色版的类型
    function changeMode(mode){
        if (filler[mode] && curFiller !== filler[mode]) {
            curFiller = filler[mode];
            var width = curFiller.width * radius, height = curFiller.height * radius;
            dp.style.width = width + 'px';
            dp.style.height = height + 'px';
            curFiller.fill(ctx);
        }
    }
    
    //显示
    function show(pos) {
        visible = 1;
        dp.style.left = pos.x + 'px';
        dp.style.top = pos.y + 'px';
    }

    //隐藏
    function hide() {
        visible = 0;
        curEle = null;
        dp.style.left = '-1000px';
    }

    //暴露接口
    var picker = {
        MODE_DZ : 'dz',
        MODE_DW : 'dw',
        pick : function(fillElement, x, y) {
            inited || init();
            if (fillElement) {
                if (visible && curEle === fillElement) {
                    hide();
                    return;
                }
                curEle = fillElement;
                if (fillElement.value) {
                    setcolor(fillElement.value.toUpperCase());
                }
            }

            if (undefined != x && undefined != y) {
                show({
                    'x' : x,
                    'y' : y
                });
            } 
            else if (fillElement) {
                var pos = getpoppos(fillElement);
                show(pos);
            } 
            else {
                show({
                    'x' : 0,
                    'y' : 0
                });
            }
        },
        setMode : function(mode) {
            changeMode(mode);
        },
        setColor : function(color) {
            inited || init();
            if (/^#[0-9A-F]{6}$/.test(color))
                setcolor(color);
        },
        getColor : function() {
            return selected;
        },
        hide : function() {
            hide();
        },
        onPick : false,
        onMove : false
    }
    return picker;
}(document);
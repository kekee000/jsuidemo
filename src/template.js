/**
 * @author mengke
 * @date 2013-3-18
 * 解析简单模板
 * 支持语法：
    (1) for:
    {for:aaa as bbb}
    {/for}
    #{bbb@first}
    #{bbb@last}
    #{bbb@index}
    
    {for:aaa as key:value}
    {/for}
    #{key}
    #{value.xxx}

    (2) if:
    {if:aaa>10&&ccc>1}
    {elseif:}
    {else:}
    {/if}
    (3) 变量：#{d.d.d}
 */
var Template = function(options){
    var opt = {
        LEFT: '\\{',
        RIGHT:'\\}',
        VAR:'#\\{'
    };
    
    function extend(dest, src) {
        for(var o in src) {
            dest[o] = src[o];
        }
    }
    
    function each(array, fn) {
        for(var i=0, l = array.length; i<l; i++) {
            fn.call(array, array[i], i);
        }
    }
    var trimer = /(^[\s\t]+)|([\s\t]+$)/g;
    function trim(str) {
        return str.replace(trimer, '');
    }
    
    //去除冗余节点
    function strip(tmpText) {
        return tmpText.replace(/[\r\t\n]/g, ' ').replace(/\s+/g, ' ');
    }
    
    //解析tag
    function parseTag(tmpText) {
        var tagReg = {
            TAG : new RegExp(opt.LEFT + '(for|if|else|elseif):(.*?)' + opt.RIGHT, 'g'), //tag
            TAGEND : new RegExp(opt.LEFT + '\/(for|if)' + opt.RIGHT, 'g'), //tag end
            VAR : new RegExp(opt.VAR + '([\\w\\.]+(@(last|first|index))?)' + opt.RIGHT, 'g') //var
        };
        var tagStack = [];
        var result = null;
        for(var regName in tagReg) {
            var reg = tagReg[regName];
            while( (result = reg.exec(tmpText)) !=null ){
                tagStack.push ({
                    type : regName,
                    name : result[1],
                    content : result[2],
                    start : result.index,
                    end : result.index + result[0].length
                });
            }
        }
        return tagStack.sort(function(i1, i2) {
            return i1.start - i2.start;
        });
    }
    
    //构造template函数
    function buildTemplate(template, tagStack) {
        var strBuilder = [];
        var for_stack = ['__scope'];//for符号表
        //查找作用域
        function contains(name) {
            for(var i = for_stack.length-1; i>=0; i--) {
                if(for_stack[i] === name) {
                    return i;
                }
            }
            return false;
        }
        //替换变量
        function replaceVar(content) {
            if(content.indexOf('@') > 0) {
                var at = content.slice(content.indexOf('@')+1);
                var idx = contains(content.slice(0, content.indexOf('@')));
                var iter = for_stack[idx-1];
                switch(at) {
                    case 'first':
                        return '(0=='+iter.iter+')';
                    case 'index':
                        return iter.iter;
                    case 'last':
                        return '('+iter.iter+'=='+iter.lst+'.length-1)';
                }
            }
            else {
                var n = content.indexOf('.') > 0 ? content.slice(0, content.indexOf('.')) : content;
                var idx = contains(n);
                var name = idx ? content : '__scope.'+content;
            }
            return name;
        }
        //替换exp
        function replaceExp (exp) {
            return exp.replace(/([a-zA-Z_][\w\.@]*)/g, function (r0, r1) {
                return replaceVar(r1);
            });
        }
        
        var guid = 0;
        //符号翻译
        var parser = {
            TAG : {
                'for' : function(tag) {
                    var sp = tag.content.split('as');
                    var lst = trim(sp[0]);
                    var name;
                    var iter;
                    //支持数组
                    if(sp[1].indexOf(':') ==-1) {
                        name = trim(sp[1]);
                        iter = '_i' + guid++;
                        lst = replaceVar(lst);
                        strBuilder.push('for(var '+iter+'=0,'+name+';'+name+'='+lst+'['+iter+'];'+iter+'++){');
                        for_stack.push({
                            iter : iter,
                            lst : lst
                        });
                    }
                    //支持hash数组
                    else {
                        sp[1] = sp[1].split(':');
                        name = trim(sp[1][0]);
                        iter = trim(sp[1][1]);
                        lst = replaceVar(lst);
                        strBuilder.push('for(var '+name+' in '+lst+'){');
                        strBuilder.push('var '+iter+'='+lst+'['+name+'];');
                        for_stack.push(iter);
                    }

                    for_stack.push(name);
                },
                'if' : function(tag) {
                    strBuilder.push('if('+replaceExp(tag.content)+'){');
                },
                'elseif' : function(tag) {
                    strBuilder.push('}else if('+replaceExp(tag.content)+'){');
                },
                'else' : function(tag) {
                    strBuilder.push('}else{');
                }
            },
            VAR : function(tag) {
                var name = replaceVar(tag.name);
                strBuilder.push('_('+name+');');
            },
            TAGEND : {
               'for' : function (tag) {
                   strBuilder.push('};');
                   for_stack.pop();
                   for_stack.pop();
               },
               'if' : function (tag) {
                   strBuilder.push('};');
               }
            }
        };
        
        //附加非tag部分
        function append(idx){
            var idx1 = tagStack[idx].end;
            var idx2 = tagStack[idx+1].start;
            var str = template.slice(idx1, idx2);
            str !== '' && strBuilder.push('_("'+str.replace(/"/g, '\\"')+'");');
        }
        
        strBuilder.push('var __str=[];function _(s){__str.push(s)};');
        //附加开始节点
        tagStack.unshift({
           type:'BEGIN',
           end : 0
        });
        //附加结束节点
        tagStack.push({
           type:'END',
           start : template.length
        });
        
        each(tagStack, function(item, index){
            var type = item.type;
            var name = item.name;
            switch(type) {
                case 'TAG': 
                case 'TAGEND':
                    parser[type][name](item);
                    append(index);
                    break;
                case 'VAR':
                    parser.VAR(item);
                    append(index);
                    break;
                case 'BEGIN':
                    append(index);
                    break;
                case 'END': 
                    break;
                default:
                    throw new Exception('type error');
            }
        });
        
        strBuilder.push('return __str.join("");');
        return new Function('__scope', strBuilder.join('\n'));
    }
    
    /**
     * 解析模板
     * @param {string} template 模板内容
     */
    this.parse = function(template) {
        var tmpText = strip(template);
        var stack = parseTag(tmpText);
        var compiled = buildTemplate(tmpText, stack);
        return compiled;
    };
    
    /**
     * 执行模板
     * @param {fn} compiled 解析后的模板内容
     * @param {json} scope 参数
     */
    this.exec = function (compiled, scope) {
        return compiled(scope);
    };
    extend(opt, options || {});
}

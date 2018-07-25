const DEBUG_MODE = false;
// 是否顯示console.log, 值: true or false
// 例:
// DEBUG_MODE && console.log("errer");

const wsUri_chat = "wss://cht.ws.kingkong.com.tw/chat_nsp/?EIO=3&transport=websocket"; //chat server

const wsUri_gift_2 = "wss://ctl-2.ws.kingkong.com.tw/control_nsp/?EIO=3&transport=websocket"; //gift server
const wsUri_gift_1 = "wss://ctl-1.ws.kingkong.com.tw/control_nsp/?EIO=3&transport=websocket"; //
var wsUri_gift;

var output; //聊天室輸出 div#output
var heat; //熱度 div#heat
var tts_check_div; //是否開啟語音 div#ttsCheck_div
var ping; // 保持websocket連線,PING-PONG
var ping2; // 保持websocket連線,PING-PONG
var chat_i = 0; //計算聊天室的行數
var tokens = []; //連線資訊
var stop_scroll = false; //上拉時防止捲動

var reconnection_chat_count = 0; //計算斷線重連次數 chat server
var reconnection_gift_count = 0; //計算斷線重連次數 gift server

//外部變數
//無設定時使用預設值
if(typeof obs_mode == "undefined"){
  var obs_mode = false;
}
if(typeof chat_limit == "undefined"){
  var chat_limit = 1000;
}

var main = {
  init: function(){
    // 當 hashtag 改變時重新載入頁面
    window.addEventListener("hashchange", function(){
      location.reload();
    }, false);

    //判斷載入分頁
    if(window.location.hash == '' || window.location.hash == '#'){
      //載入首頁
      this.goto_home_page();
    }else{
      //載入聊天室頁面
      this.goto_chat_page();
    }
  },
  goto_home_page: function(){ //載入首頁
    document.getElementById("c_script").style.display = 'block';
    this.change_channel_btn(); //改完後觸發hashchange重載頁面
  },
  goto_chat_page: function(){ //載入聊天室頁面
    this.check_scroll(); //檢查畫面捲動方向,如果向上則觸法暫停捲動功能

    output = document.getElementById("output"); //聊天室輸出
    output.innerHTML = '';

    heat = document.getElementById("heat"); //熱度
    heat.innerHTML = '熱度: 0';

    if(obs_mode == false){ tts_check_div = document.getElementById("ttsCheck_div"); } //是否開啟語音

    this.scroll_to_bottom_btn(); //建立向下捲動按鈕
    this.get_token(); //取得token
  },
  change_channel_btn: function(){ //首頁切換頻道按鈕
    let btn_submit = document.getElementById("btn_submit");
    let input_submit = document.getElementById("inputChannel");

    btn_submit.addEventListener("mouseup", function(){
      DEBUG_MODE && console.log("onmouseup");
      DEBUG_MODE && console.log(input_submit.value);
      window.location.hash = `#${input_submit.value}`;
    });

    input_submit.addEventListener("keydown", function(e){
      if(e.keyCode == 13 || e.which == 13){
        DEBUG_MODE && console.log("onkeydown");
        DEBUG_MODE && console.log(input_submit.value);
        window.location.hash = `#${input_submit.value}`;
      }
    });
  },
  get_token: function(){ //取得連線資訊
    let get_hashtag = window.location.hash;
    let get_tokeh_url;

    if(window.location.hash !== ''){
      //let get_hashtag_num = get_hashtag.replace(/[^0-9]/g,'');
      let get_hashtag_num = this.htmlEncode(get_hashtag.substr(1));

      //get_tokeh_url = `get_token.php?u=${get_hashtag_num}`;
	  get_tokeh_url = `https://banana-211307.appspot.com/?u=${get_hashtag_num}`;

      let that = this;

      $.ajax({
        type: 'GET',
        url: get_tokeh_url,
        dataType: 'json',
        success: function(data) {
          //DEBUG_MODE && console.log(data.data);

          if( (typeof data != "undefined") && (typeof data.data != "undefined") ){
            //連線資料
            tokens['token'] = data.data[0].token;
            tokens['live_id'] = data.data[0].room.live_id;
            tokens['room_id'] = data.data[0].room.room_id; //禮物效果用
            tokens['uid'] = data.data[0].room.uid; //禮物效果用

            //其他資料
            tokens['nickname'] = that.htmlEncode(data.data[0].room.nickname);
            tokens['room_title'] = that.htmlEncode(data.data[0].room.room_title);

            document.getElementById("announcements").style.display = 'none';
            document.getElementById("tool_bar").style.display = 'block';

            //document.title = `[${tokens['nickname']}] ${tokens['room_title']} - BABANANA Chat`;

            that.writeToScreen(`歡迎來到 ${tokens['nickname']} 的實況台`);
            that.writeToScreen(`實況標題: ${tokens['room_title']}`);

            //館長台
            if(get_hashtag_num == "2282757"){
              wsUri_gift = wsUri_gift_1;
            }else{
              wsUri_gift = wsUri_gift_2;
            }

            //連接聊天室伺服器
            webSocket_chat();

            //連接禮物伺服器
            webSocket_gift();
          }else{
            that.writeToScreen(`[錯誤]找不到指定的聊天室!<br>回到 <a href="./">[首頁]</a>`);
          }
        },
        error: function() {
          DEBUG_MODE && console.log("errer");
        },
        complete: function(){
          //DEBUG_MODE && console.log("test");
        }
      });
    }
  },
  htmlEncode: function(html_c){ //去除XSS字元
    return html_c.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
  writeToScreen: function(message,class_name_arr){ //將訊息寫入畫面的 div#output 裡
    //避免訊息過多瀏覽器當掉,超過1000則訊息時清空畫面
    if(chat_i > chat_limit){
      output.innerHTML = "";
      console.clear();
      chat_i = 0;
    }

    let pre = document.createElement("div");
    //pre.style.wordWrap = "break-word";
    pre.classList.add("output_lines");
    if(typeof class_name_arr !== "undefined"){
      pre.classList.add(...class_name_arr);
    }else{
      pre.classList.add("kk_chat");
    }

    message = message.trim();
    //pre.innerHTML = message.replace(/\n/g, "<br />"); // 將"\n"轉換成"<br />"
    pre.innerHTML = `<span class="kk_time">[${this.get_time()}]</span><span class="kk_border"></span>${message}`;

    output.appendChild(pre); //輸出訊息在畫面上

    this.scroll_to_bottom_auto();

    chat_i++; //目前頁面訊息數
  },
  scroll_to_bottom_auto: function(){ //畫面自動捲動
    if(stop_scroll == false){
      window.scrollTo(0,document.body.scrollHeight); //畫面自動捲動
    }else{
      //document.getElementById("scroll_to_bottom_btn").style.display = 'block';
    }
  },
  scroll_to_bottom_btn: function(){ //向下捲動的按鈕
    let scroll_to_bottom_btn = document.getElementById("scroll_to_bottom_btn");
    scroll_to_bottom_btn.addEventListener("mouseup", function(){
      window.scrollTo(0,document.body.scrollHeight);
      document.getElementById("scroll_to_bottom_btn").style.display = 'none';
      stop_scroll = false;
    });
  },
  pt: function(num){ //數字小於10時前面補0
    return ( num < 10 ? "0" : "" ) + num;
  },
  get_time: function(){ //取得目前時間
    let now_time = new Date();

    //let year = now_time.getFullYear();
    //let month = this.pt( now_time.getMonth() + 1 );
    //let day = this.pt( now_time.getDate() );

    let hours = this.pt( now_time.getHours() );
    let minutes = this.pt( now_time.getMinutes() );
    //let seconds = this.pt( now_time.getSeconds() );

    let txt_datetime = `${hours}:${minutes}`;

    return txt_datetime;
  },
  numberWithCommas: function(x){ //數字千位加逗點
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },
  check_scroll: function(){ //檢查畫面捲動方向,如果向上則觸法暫停捲動功能
    //原版
    var lastScrollTop = 0;
    if(obs_mode != true){
      window.addEventListener("scroll", function(){
        //console.log("on scroll");
        var st = window.pageYOffset || document.documentElement.scrollTop;
        if (st > lastScrollTop){
          // downscroll code
          //console.log("down scroll");
        } else {
          // upscroll code
          //console.log("up scroll");
          stop_scroll = true;
          document.getElementById("scroll_to_bottom_btn").style.display = 'block';
        }
        lastScrollTop = st;
      }, false);
    }

    //修改版
    /*
    var lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if(obs_mode != true){
      window.addEventListener("scroll", function(){
        //console.log("on scroll");
        var st = window.pageYOffset || document.documentElement.scrollTop;
        //console.log(st, lastScrollTop);
        if ( (lastScrollTop - st) > 10 ){
          // upscroll code
          //console.log("up scroll");
          stop_scroll = true;
          document.getElementById("scroll_to_bottom_btn").style.display = 'block';
        }
        lastScrollTop = st;
      }, false);
    }
    */
  },
};


//聊天室
var ws_chat = {
  onOpen: function(evt){
    //DEBUG_MODE && console.log(evt);
    main.writeToScreen(`[成功連接聊天室伺服器]`, ["kk_chat","kk_conn","kk_reconn"]);

    reconnection_chat_count = 0;
  },
  onClose: function(evt){
    main.writeToScreen(`[❎與聊天室伺服器斷線]`, ["kk_chat","kk_conn","kk_reconn"]);

    this.reConnection();
  },
  onMessage: function(evt){
    DEBUG_MODE && console.log(evt.data);

    let chat_string = evt.data.trim();

    if(chat_string.substr(0,2) == "0{") {
      this.doSend(`40/chat_nsp,`);
    }

    if(chat_string == "40/chat_nsp"){
      //doSend(`42/chat_nsp,["authentication",{"live_id":"2282757G26945GPLo","token":"這裡是token","client_type":"web"}]`);

      this.doSend(`42/chat_nsp,["authentication",{"live_id":"${tokens['live_id']}","token":"${tokens['token']}","client_type":"web"}]`);
    }

    let self = this;
    if(chat_string == `42/chat_nsp,["authenticated",true]`){
      ping = setTimeout(function(){
        self.doSend("2");
      },50000);

      main.writeToScreen(`[✅聊天室伺服器]`, ["kk_chat","kk_conn"]);

      if(obs_mode == false){
        //tts_check_div.style.display = 'block';
        $("#setting").css("display","inline-block");

        //開啟設定選單
        $("#tool_bar").on("mouseup", function(){
          //console.log("#tool_bar mouseup");
          //$("#tts_check_div").toggle();

          $("#ttsCheck_div").toggle();
        });

        $("#ttsCheck").change(function(){
          //console.log("#ttsCheck on change");
          if( $("#ttsCheck").prop("checked") == true ){
            console.log("#ttsCheck true");
          }else{
            console.log("#ttsCheck false");
            tts.cancel2();
          }
        });
      }
    }
    if(chat_string == "3") {
      clearTimeout(ping);
      ping = setTimeout(function(){
        self.doSend("2");
      },50000);
    }

    if(chat_string.substr(0,11) == "42/chat_nsp"){
      let json_txt = chat_string.substr(12);
      let json_decode = JSON.parse(json_txt);
      DEBUG_MODE && console.log(json_decode);
      let w_name;
      let pfid;

      switch(json_decode[0]){
        case "msg":
          w_name = main.htmlEncode(json_decode[1].name);
          let msg = main.htmlEncode(json_decode[1].msg);
          let grade_lvl = json_decode[1].grade_lvl;
          let rel_color = json_decode[1].rel_color;
          let color_css = rel_color?("color:"+rel_color+";"):"";
          pfid = json_decode[1].pfid;
          //console.log(json_decode[1].pfid);

          let role = "";
          if( json_decode[1].is_admin == true ){
            role = "[管理] ";
          }
          if( w_name == tokens['nickname'] && pfid == tokens['uid'] ){
            role = "[主播] ";
          }
          if( json_decode[1].role == 1 ){
            role = "[官方] ";
          }



          DEBUG_MODE && console.log(`${w_name} : ${msg}`);

          //tts
          if(obs_mode == false){
            if(document.getElementById("ttsCheck").checked == true){
              tts.speak2(msg);
            }
          }

          main.writeToScreen(`<span class="isadmin">${role}</span><!--
            <span class="grade_lvl">[${grade_lvl}]</span>
            --><span class="name name_title" style="${color_css}" title="${pfid}">${w_name}</span>
            <span class="msg">: ${msg}</span>`, ["kk_chat"]);
          break;
        case "join":
          w_name = main.htmlEncode(json_decode[1].name);
          pfid = json_decode[1].pfid;
          DEBUG_MODE && console.log(`[ ${w_name} ] 進入聊天室`);
          main.writeToScreen(`[ <span class="name_title" title="${pfid}">${w_name}</span> ] 進入聊天室`, ["kk_come"]);
          break;
      }
    }
  },
  onError: function(evt){
    main.writeToScreen('<span style="color: red;">[ERROR]:</span> ' + main.htmlEncode(evt.data));
  },
  doSend: function(message){
    websocket.send(message);
  },
  reConnection: function(){
    websocket.close();
    websocket = null;
    reconnection_chat_count++;
    if(reconnection_chat_count <= 25){
      window.setTimeout(function(){
        main.writeToScreen(`[重新連接聊天室伺服器..(${reconnection_chat_count})]`, ["kk_chat","kk_conn","kk_reconn"]);
        webSocket_chat();
      },15000);
    }else{
      main.writeToScreen(`[重新連接聊天室伺服器..(連線失敗)]`, ["kk_chat","kk_conn","kk_reconn"]);
    }

  },
};

//聊天室
function webSocket_chat(){
  websocket = new WebSocket(wsUri_chat);

  //websocket的事件監聽器
  websocket.onopen = function(evt) { ws_chat.onOpen(evt) };
  websocket.onclose = function(evt) { ws_chat.onClose(evt) };
  websocket.onmessage = function(evt) { ws_chat.onMessage(evt) };
  websocket.onerror = function(evt) { ws_chat.onError(evt) };
}


//禮物效果
var ws_gift = {
  onOpen: function(evt){
    main.writeToScreen(`[成功連接禮物伺服器]`, ["kk_gift","kk_conn","kk_reconn"]);
    //DEBUG_MODE && console.log(evt);
    heat.style.display = 'inline-block'; //開啟熱度欄

    reconnection_gift_count = 0;
  },
  onClose: function(evt){
    main.writeToScreen(`[❎與禮物伺服器斷線]`, ["kk_gift","kk_conn","kk_reconn"]);

    this.reConnection();
  },
  onMessage: function(evt){
    DEBUG_MODE && console.log(evt.data);

    let chat_string = evt.data.trim();

    if(chat_string.substr(0,2) == "0{") {
      this.doSend(`40/control_nsp,`);
    }

    if(chat_string == "40/control_nsp"){
      //doSend(`42/control_nsp,["authentication",{"live_id":"2152350G64995LSG4","anchor_pfid":2152350,"token":"這裡是token","client_type":"web"}]`);

      this.doSend(`42/control_nsp,["authentication",{"live_id":"${tokens['live_id']}","anchor_pfid":${tokens['room_id']},"token":"${tokens['token']}","client_type":"web"}]`);
    }

    let self = this;
    if(chat_string == `42/control_nsp,["authenticated",true]`){
      ping2 = setTimeout(function(){
        self.doSend("2");
      },50000);

      main.writeToScreen(`[✅禮物伺服器]`, ["kk_gift","kk_conn"]);
    }
    if(chat_string == "3") {
      clearTimeout(ping2);
      ping2 = setTimeout(function(){
        self.doSend("2");
      },50000);
    }

    if(chat_string.substr(0,14) == "42/control_nsp"){
      let json_txt = chat_string.substr(15);
      let json_decode = JSON.parse(json_txt);
      DEBUG_MODE && console.log(json_decode);
      //console.log(json_decode[0]);
      let w_name;

      let mute_nickname;
      let mute_pfid;

      switch(json_decode[0]){
        case "site_customize":
          DEBUG_MODE && console.log(json_decode[1]);
          /*
            42/control_nsp,
            [
              "site_customize",
              {
                "data":
                {
                  "duration":20,
                  "icon":"http://blob.ufile.ucloud.com.cn/c6da5179d94ba255aea5e524ad9b562a",
                  "send_nickname":"🎹🎺PonPon🎰",
                  "gift_name":"旺旺鞭炮",
                  "award_times":500,
                  "award_amout":1500,
                  "live_info":null,
                  "filter":{"noti_flag":3},
                  "Event":"notify_gift_crit"
                },
                "at":1519369750593
              }
            ]
          */

          let send_nickname = json_decode[1].data.send_nickname;
          let gift_name = json_decode[1].data.send_gift_name;
          let award_times = json_decode[1].data.award_times;
          //let msg = htmlEncode(json_decode[1].msg);
          //let grade_lvl = json_decode[1].grade_lvl;
          //let rel_color = json_decode[1].rel_color;
          //let color_css = rel_color?("color:"+rel_color+";"):"";

          //DEBUG_MODE && console.log(`${w_name} : ${msg}`);

          //w_name = json_decode[1];
          /*
          writeToScreen(`
            <div class="kk_gift">
              <span>${send_nickname} 送出 ${award_times}個 [${gift_name}]</span>
            </div>
          `);
          */
          break;
        case "site_customize":


          break;
        case "room_broadcast":
          /*
            42/control_nsp,
            ["room_broadcast",{
              "type":1,"content":{"fe_name":"西門","fe_id":2152350,"fr_name":"未央派","fr_id":2204294,"fr_lv":15,"fr_grade_id":1,"fr_grade_lvl":31},"at":1519369770728
            }]
          */

          //console.log(`${json_decode[1]}`);

          //追蹤
          if(json_decode[1].type == 1){
            //console.log(`${json_decode[1].content.fr_name} 追蹤了主播`);
            main.writeToScreen(`<span>[ <span class="name_title" title="${json_decode[1].content.fr_id}">${json_decode[1].content.fr_name}</span> ] 追蹤了主播</span>`, ["kk_gift"]);
          }


          break;
        case "room_customize":
          /*
            42/control_nsp,
            ["room_customize",{
              "data":{"delta":-846,"heat":168294,"Event":"live_heat","at":1519369752448},"at":1519369752448
            }]
          */

          //console.log(json_decode[1]);

          //熱度:
          if(json_decode[1].data.Event == "live_heat"){
            //console.log(json_decode[1].data.heat);
            heat.innerHTML = `熱度: ${main.numberWithCommas(json_decode[1].data.heat)}`;

            break;
          }

          /*
            42/control_nsp,
            ["room_customize",{
              "data":{"icon":[{"index":60,"line_1":"TOP100+","line_2":"福氣值:713","now_icon":""}],"Event":"live_icon_dynamic","at":1519369775403},"at":1519369775403
            }]
          */

          /*
            42/control_nsp,
            [
              "room_customize",
              {
                "data":{
                  "live_id":"2152350G64995LSG4",
                  "f_pfid":2426076,
                  "f_nickname":"EOTONES",
                  "f_headimg":"http://blob.ufile.ucloud.com.cn/2f3713397e7df78ad17b4f163459b25a",
                  "f_lvl":6,
                  "prod_id":1335,
                  "prod_cnt":"1",
                  "prod_total":2,
                  "display":"1",
                  "prod_clickid":"1519373595671",
                  "prod_combo":1,
                  "prod_giftnum":"1",
                  "anchor_diamond":"820284",
                  "anchor_diamond_day":"3335",
                  "combo_final":0,
                  "vip_fan":0,
                  "grade_id":1,
                  "grade_lvl":13,
                  "Event":"gift_send",
                  "at":1519373610626
                },
                "at":1519373610626
              }
            ]
          */

          // 禮物列表
          // https://g-api.langlive.com/webapi/v1/gift/list?live_id=2282757G99342N1nd&pfid=2426076&anchor_pfid=2282757
          let prod_id_arr = [];

          prod_id_arr[1001] = "小紅包";
          prod_id_arr[1002] = "大紅包";
          prod_id_arr[1159] = "火箭";

          prod_id_arr[1313] = "MVP";

          prod_id_arr[1334] = "94狂";
          prod_id_arr[1335] = "掌聲鼓勵";
          prod_id_arr[1336] = "很廢";
          prod_id_arr[1337] = "好棒棒";
          prod_id_arr[1339] = "能量飲料";

          prod_id_arr[1341] = "平底鍋";
          prod_id_arr[1342] = "灰機";

          prod_id_arr[1362] = "歡樂送";
          prod_id_arr[1364] = "大雞大利";
          prod_id_arr[1365] = "香蕉";
          prod_id_arr[1366] = "幸運幣";
          prod_id_arr[1367] = "卡牌包";

          prod_id_arr[1370] = "問號燈";
          prod_id_arr[1371] = "凱撒之力";
          prod_id_arr[1372] = "天使甲";
          prod_id_arr[1373] = "小金人";

          prod_id_arr[1393] = "LMS徽章";

          prod_id_arr[1462] = "帥氣";
          prod_id_arr[1469] = "COOL";
          prod_id_arr[1470] = "神操作";

          prod_id_arr[1473] = "全力聲援";

          prod_id_arr[1559] = "AWM";
          prod_id_arr[1560] = "雞毛";
          prod_id_arr[1561] = "主播加油券";

          prod_id_arr[1778] = "空投箱";


          if(json_decode[1].data.f_nickname != null && json_decode[1].data.prod_id != null && json_decode[1].data.prod_id >= 1000 && json_decode[1].data.prod_id != 1059 && json_decode[1].data.prod_id != 1077 && json_decode[1].data.prod_id <= 4000){
            let f_nickname = json_decode[1].data.f_nickname;
            let prod_cnt = json_decode[1].data.prod_cnt;
            let prod_total = json_decode[1].data.prod_total;
            let prod_id = json_decode[1].data.prod_id;
            //let msg = htmlEncode(json_decode[1].msg);
            //let grade_lvl = json_decode[1].grade_lvl;
            //let rel_color = json_decode[1].rel_color;
            //let color_css = rel_color?("color:"+rel_color+";"):"";

            let pfid = json_decode[1].data.f_pfid;

            //DEBUG_MODE && console.log(`${w_name} : ${msg}`);

            //w_name = json_decode[1];

            if(typeof prod_id_arr[prod_id] != 'undefined'){

              if(prod_id == 1365){ //香蕉
                main.writeToScreen(`<span><span class="name_title" title="${pfid}">${f_nickname}</span> 送出 ${prod_cnt}個 [${prod_id_arr[prod_id]}]</span>`, ["kk_gift","kk_bana"]);
              }else{
                main.writeToScreen(`<span><span class="name_title" title="${pfid}">${f_nickname}</span> 送出 ${prod_cnt}個 [${prod_id_arr[prod_id]}]</span>`, ["kk_gift"]);

                /*
                //tts
                if(obs_mode == false){
                  console.log(`prod_total: ${parseInt(json_decode[1].data.prod_total)}`);
                  if(parseInt(json_decode[1].data.prod_total) >= 5){
                    //if(document.getElementById("ttsCheck").checked == true){
                      let gift_msg = `感謝 ${f_nickname} 送出 ${prod_cnt} 個 ${prod_id_arr[prod_id]}`;
                      //tts.speak2(gift_msg);
                      console.log(gift_msg);
                    //}
                  }
                }
                */

              }
            }

          }
          break;
        case "mute_notify": //ban人訊息
          //console.log(json_decode);
          mute_nickname = json_decode[1].data.nickname;
          mute_pfid = json_decode[1].data.pfid;
          main.writeToScreen(`<span><span class="mute_name_title" title="${mute_pfid}">${mute_nickname}</span> 已被靜音</span>`, ["kk_mute"]);

          break;
        case "unmute_notify": //解ban訊息
          mute_nickname = json_decode[1].data.nickname;
          mute_pfid = json_decode[1].data.pfid;
          main.writeToScreen(`<span><span class="mute_name_title" title="${mute_pfid}">${mute_nickname}</span> 解除靜音</span>`, ["kk_mute"]);

          break;
      }
    }
  },
  onError: function(evt){
    main.writeToScreen('<span style="color: red;">[ERROR]:</span> ' + main.htmlEncode(evt.data));
  },
  doSend: function(message){
    websocket_gift.send(message);
  },
  reConnection: function(){
    websocket_gift.close();
    websocket_gift = null;
    reconnection_gift_count++;
    if(reconnection_gift_count <= 25){
      window.setTimeout(function(){
        main.writeToScreen(`[重新連接禮物伺服器..(${reconnection_chat_count})]`, ["kk_gift","kk_conn","kk_reconn"]);
        webSocket_gift();
      },15000);
    }else{
      main.writeToScreen(`[重新連接禮物伺服器..(連線失敗)]`, ["kk_gift","kk_conn","kk_reconn"]);
    }

  },
};

//禮物效果
function webSocket_gift(){
  websocket_gift = new WebSocket(wsUri_gift);

  //websocket的事件監聽器
  websocket_gift.onopen = function(evt) { ws_gift.onOpen(evt) };
  websocket_gift.onclose = function(evt) { ws_gift.onClose(evt) };
  websocket_gift.onmessage = function(evt) { ws_gift.onMessage(evt) };
  websocket_gift.onerror = function(evt) { ws_gift.onError(evt) };
}


(function(){
  //程式進入點
  window.addEventListener("load", main.init(), false);
})();

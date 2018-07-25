class tts2 {
  constructor(){
    console.log("tts constructor");
    window.speechSynthesis.cancel(); //強制中斷之前的語音
    this.synth = window.speechSynthesis;
    this.v_index = 0;

    //


    this.u = null;
    this.u = new SpeechSynthesisUtterance();

    let v_index = -1;



    if (localStorage.getItem("ls_rate") === null) {
      this.u.rate = 1.2; // 語速 0.1~10
    }else{
      this.u.rate = Number(localStorage.getItem("ls_rate"));
    }

    if (localStorage.getItem("ls_volume") === null) {
      this.u.volume = 0.5; //音量 0~1
    }else{
      this.u.volume = Number(localStorage.getItem("ls_volume"));
    }

    if (localStorage.getItem("ls_pitch") === null) {
      this.u.pitch = 1; //語調 0.1~2
    }else{
      this.u.pitch = Number(localStorage.getItem("ls_pitch"));
    }



    //this.u.pitch = 1;

    //this.u.text = "";



    this.u.onend = function(event){
      //console.log(event);
      console.log("tts.onend");
    };

    this.u.onerror = function(event){
      //console.log(event);
      console.log("tts.onerror", event);
      this.cancel2();
    };
  }

  speak2(textToSpeak){
    //console.log(document.getElementById("ttsCheck").checked == true ? "[語音開啟]" : "[語音關閉]");
    let that = this;

    this.voices = this.synth.getVoices();
    for(let index = 0; index < this.voices.length; index++) {
      /*
      "Google US English"
      "Google 日本語"
      "Google 普通话（中国大陆）"
      "Google 粤語（香港）"
      "Google 國語（臺灣）"
      */

      //console.log(this.voices[index].name);
      if(this.voices[index].name == "Google 國語（臺灣）"){
        //console.log("Y");
        //this.u.lang = 'zh-TW';
        this.u.voice = this.voices[index];
        break;
      }else{
        //console.log("N");
        this.u.lang = 'zh-TW';
      }
    }

    //console.log("test");

    this.u.text = that._textFilter(textToSpeak);

    this.u.onstart = function(event){
      //console.log(event);
      console.log("tts.onstart", textToSpeak);
    };

    if( (that.u.text.length > 0) || (this.u.text != null) ){
      this.synth.speak(this.u);
    }

    return this;
  }

  cancel2(){
    console.log("tts cancel");
    window.speechSynthesis.cancel();
  }

  volume(volume_val){
    let volume = Number(volume_val);
    if(volume >= 0 && volume <= 1){
      tts.u.volume = volume;
      localStorage.setItem("ls_volume", volume);
      console.log(`音量調整為: ${tts.u.volume}`);
    }else{
      console.log(`超出範圍`);
    }
  }
  rate(rate_val){
    let rate = Number(rate_val);
    if(rate >= 0.5 && rate <= 2){
      tts.u.rate = rate;
      localStorage.setItem("ls_rate", rate);
      console.log(`語速調整為: ${tts.u.rate}`);
    }else{
      console.log(`超出範圍`);
    }
  }
  pitch(pitch_val){
    let pitch = Number(pitch_val);
    if(pitch >= 0.1 && pitch <= 2){
      tts.u.pitch = pitch;
      localStorage.setItem("ls_pitch", pitch);
      console.log(`語調調整為: ${tts.u.pitch}`);
    }else{
      console.log(`超出範圍`);
    }
  }
  reset(){
    //localStorage.clear();
    localStorage.removeItem("ls_volume");
    localStorage.removeItem("ls_rate");
    localStorage.removeItem("ls_pitch");
  }

  _textFilter(msg){
    msg = msg.replace(/^(1){4,}$/g, "一一一");
    msg = msg.replace(/^(2){4,}$/g, "二二二");
    msg = msg.replace(/^(3){4,}$/g, "三三三");
    msg = msg.replace(/^(4){4,}$/g, "四四四");
    msg = msg.replace(/^(5){4,}$/g, "五五五");
    msg = msg.replace(/^(6){4,}$/g, "六六六");
    msg = msg.replace(/^(7){4,}$/g, "七七七");
    msg = msg.replace(/^(8){4,}$/g, "八八八");
    msg = msg.replace(/^(9){4,}$/g, "九九九");

    msg = msg.replace(/^(w){4,}$/gi, "哇拉");
    msg = msg.replace(/^(~){3,}$/g, "~~~");
    msg = msg.replace(/^(\.){3,}$/g, "...");

    msg = msg.replace(/^484$/gi, "四八四");
    msg = msg.replace(/^87$/g, "八七");
    msg = msg.replace(/^94$/g, "九四");
    msg = msg.replace(/^9487$/g, "九四八七");

    //過濾emoji(最多3個,超過就刪除)
    msg = msg.replace(/(\ud83d[\ude00-\ude4f]){4,}/g, "");

    return msg;
  }
}

//

var tts = new tts2();
//tts2.init();
/*
tts
.speak2("大家看到我，就知道我是誰了，我就是歐付寶終結者RRRRRRRRRRRRRRRRRRRRR")
.speak2("測試1")
.speak2("測試2")
.speak2("測試3")
.speak2("測試4")
.speak2("測試5");
*/

var CM = new CommentManager(
  document.getElementById("my-comment-stage")
);
// CM.init(); // 初始化
let matchData;
let matches = [];
const HOST = "https://api.acplay.net";

const getURLComments = url => {
  $.ajaxSettings.async = false;
  const danmukuList = []
  $.get(`${HOST}/api/v2/extcomment?url=${url}`, function (data) {
    console.log('其它站点的：', url, data)
    const comments = data.comments
    for(let comment of comments){
      let p = comment.p.split(',')
      danmukuList.push({
          mode: parseInt(p[1]),
          text: comment.m,
          stime: parseInt(p[0]) * 1000,
          size: 25,
          color: parseInt(p[2])
      })
    }
  })
  $.ajaxSettings.async = true;
  return danmukuList
}
function addCommentLink(){
  console.log(addCommentLinkData.value)
  const link = addCommentLinkData.value
  const comments = getURLComments(link)
  for (const comment of comments) {  
    CM.insert(comment)
  }
}
function getOtherComment(episodeId, min = 100){
  $.ajaxSettings.async = false;
  const danmukuList = []
  $.get(`${HOST}/api/v2/related/${episodeId}`, function (data) {
    console.log('其它弹幕站点：', data)
    const siteInfo = data.relateds
    for(let site of siteInfo){
      let comments = getURLComments(site.url)
      danmukuList.push(...comments)
    }
  })
  $.ajaxSettings.async = true;
  return danmukuList
}
function getComment(data) {
  const episodeId = data.episodeId;
  $.get(`${HOST}/api/v2/comment/${episodeId}`, function (data) {
      console.log(data);
      // 转换为CCL可识别的弹幕对象
      const danmukuList = []
      for(let comment of data.comments){
          // p 出现时间,模式,颜色,用户ID
          // m 弹幕文字
          // b 1677752470 & 0xff
          // g (1677752470 & 0xff00) >> 8
          // r 1677752470 >> 24
          let p = comment.p.split(',')
          danmukuList.push({
              mode: parseInt(p[1]),
              text: comment.m,
              stime: parseInt(p[0]) * 1000,
              size: 25,
              color: parseInt(p[2])
          })
      }
      // 弹幕小于100，尝试获取其它站点弹幕
      if(data.count < 100){
        danmukuList.push(...getOtherComment(episodeId))
      }
      console.log(danmukuList)
      CM.load(danmukuList);
      CM.time(0);
  });
}
function mainStart(data) {

  CM.init(); // 初始化
  if($("#play")[0].duration)
  data.duration = $("#play")[0].duration;
  $.post(`${HOST}/api/v2/match`, data, function (data, status) {
      console.log("数据: \n", data, "\n状态: ", status);
      if (data.isMatched) {
          // 精确匹配
          getComment(data.matches[0]);
      } else {
          // 多个匹配，选择
          matches = data.matches;
          $("#selectVideos").empty();
          matches.forEach((element, index) => {
              $("#selectVideos").append(
                  `<input type="radio" id="video-${index}" name="video" value="video-${index}" onchange="selectVideo(${index})"><label for="video-${index}">${element.animeTitle} - ${element.episodeTitle}</label><br />`
              );
          });
      }
  });
}
function search(){
  const data = {
      fileName: searchName.value,
      fileSize: matchData.fileSize,
      fileHash: matchData.fileHash,
  }
  mainStart(data)
}
// 选择剧集
function selectVideo(index) {
  console.log("选择视频");
  $("#selectVideos").empty();
  getComment(matches[index]);
}

function selectFile(e) {
  console.log(e.files);
  const reqData = {};
  const file = e.files[0];
  reqData.fileName = file.name.split('.')[0];
  reqData.fileSize = file.size;
  const url = window.URL.createObjectURL(file);
  $("#play")[0].src = url;

  // md5
  let blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice
  const fileReader = new FileReader();
  // 取前16MB计算MD5
  fileReader.readAsBinaryString(blobSlice.call(file, 0, 16 * 1024 * 1024));
  fileReader.onload = (e) => {
      console.log(e)
      const md5 = SparkMD5.hashBinary(e.target.result);
      console.log(e, md5);
      reqData.fileHash = md5;
      matchData = reqData
      mainStart(reqData);
  };
}

function startPlay(){
  // 
  console.log("开始播放")
  CM.start()
  play.play()
  setInterval(function () {
      CM.time(Math.round(play.currentTime * 1000));
  }, 100);
}
function pausePlay(){
  // 
  CM.stop()
  play.pause()
}
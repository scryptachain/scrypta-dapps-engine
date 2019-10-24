var express = require('express')
var app = express()
const axios = require('axios')
var IdaNode = ''
var session = require('express-session')

app.use(session({
  secret: 'scrypta-dapp-engine',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}))

async function startEngine(){
  var checknodes = ['idanodejs01.scryptachain.org'] //JUST FOR TESTING PURPOSE
  var connected = false
  while(connected === false){
      var checknode = checknodes[Math.floor(Math.random()*checknodes.length)];
      const check = await axios.get('https://' + checknode + '/wallet/getinfo')
      if(check.status === 200){
          connected = true
          app.listen(3000)
          console.log('CONNECTED TO NODE ' + checknode)
          IdaNode = checknode
          console.log('DAPP ENGINE READY')
      }
  }
}

console.log('STARTING DAPP ENGINE')
app.get('/:request', function (req, res){
  setTimeout(function () {
    const request = req.params.request
    if(request.length === 34){
      var dapp_address = request
      console.log('READING DAPP FROM ' + dapp_address)
      axios.post('https://'+IdaNode + '/read', { address: dapp_address, history: false })
        .then(response => {
          if(response.data.data !== undefined){
            var last_release = response.data.data.length - 1
            //FETCHING LAST RELEASE
            if(last_release >= 0 && response.data.data[last_release].protocol === 'dapp://'){
              req.session.dapp_folder = response.data.data[last_release].data
              console.log('FETCHING FOLDER LIST FROM ' + req.session.dapp_folder)
              axios.get('http://'+IdaNode + '/ipfs/ls/' + req.session.dapp_folder).then(result => {
                var dapp_files = result.data
                //console.log(result)
                //LOOPING ALL FOLDER
                for(var i = 0; i < dapp_files.length; i++){
                  var file = dapp_files[i]
                  //CHECKING FOR INDEX.HTML
                  if(file.name === 'index.html'){
                    console.log('DAPP FOUND, SERVING index.html')
                    axios.get('http://'+IdaNode + '/ipfs/' + file.hash).then(result => {
                      res.send(result.data)
                    })
                  }
                }
              })
            }else{
              res.send('OPS, THIS IS NOT A DAPP!')
            }
          }
        }).catch(error => {
          console.log(error)
        })
    }else{
      const httpreq = require('request');
      console.log('FETCHING ASSET http://'+IdaNode + '/ipfs/' + req.session.dapp_folder + '/' + request)
      httpreq.get('http://'+IdaNode + '/ipfs/' + req.session.dapp_folder + '/' + request).pipe(res)
    }
  }, 10 * Math.floor((Math.random() * 10) + 1))
});

startEngine()
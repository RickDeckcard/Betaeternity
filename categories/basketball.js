const contractSource = `
  contract MemeVote =
      record meme =
        { creatorAddress : address,
          url            : string,
          name           : string,
          voteCount      : int }
      record state =
        { memes      : map(int, meme),
          memesLength : int }
      function init() =
        { memes = {},
          memesLength = 0 }
      public function getMeme(index : int) : meme =
        switch(Map.lookup(index, state.memes))
          None    => abort("There was no meme with this index registered.")
          Some(x) => x
      public stateful function registerMeme(url' : string, name' : string) =
        let meme = { creatorAddress = Call.caller, url = url', name = name', voteCount = 0}
        let index = getMemesLength() + 1
        put(state{ memes[index] = meme, memesLength = index })
      public function getMemesLength() : int =
        state.memesLength
      public stateful function voteMeme(index : int) =
        let meme = getMeme(index)
        Chain.spend(meme.creatorAddress, Call.value)
        let updatedVoteCount = meme.voteCount + Call.value
        let updatedMemes = state.memes{ [index].voteCount = updatedVoteCount }
        put(state{ memes = updatedMemes })
`;
const contractAddress ='ct_vwkanJz5b6BGNtZRfAR4UnXc3u7XmH4uDg1BZZzsowwFMbQsG';
var client = null;
var memeArray = [];
var memesLength = 0;


function renderMemes() {
  memeArray = memeArray.sort(function(a,b){return b.votes-a.votes})
  var template = $('#template').html();
  Mustache.parse(template);
  var rendered = Mustache.render(template, {memeArray});
  $('#memeBody').html(rendered);
}

//Create a asynchronous read call for our smart contract
async function callStatic(func, args) {
  //Create a new contract instance that we can interact with
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  //Make a call to get data of smart contract func, with specefied arguments
  const calledGet = await contract.call(func, args, {callStatic: true}).catch(e => console.error(e));
  //Make another call to decode the data received in first call
  const decodedGet = await calledGet.decode().catch(e => console.error(e));

  return decodedGet;
}

//Create a asynchronous write call for our smart contract
async function contractCall(func, args, value) {
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  //Make a call to write smart contract func, with aeon value input
  const calledSet = await contract.call(func, args, {amount: value}).catch(e => console.error(e));

  return calledSet;
}

window.addEventListener('load', async () => {
  $("#loader").show();

  client = await Ae.Aepp();

  //First make a call to get to know how may memes have been created and need to be displayed
//Assign the value of meme length to the global variable
memesLength = await callStatic('getMemesLength', []);

//Loop over every meme to get all their relevant information
for (let i = 1; i <= memesLength; i++) {

  //Make the call to the blockchain to get all relevant information on the meme
  const meme = await callStatic('getMeme', [i]);

  //Create meme object with  info from the call and push into the array with all memes
  memeArray.push({
    creatorName: meme.name,
    memeUrl: meme.url,
    index: i,
    votes: meme.voteCount,
  })
}

  renderMemes();

  $("#loader").hide();

});

//If someone clicks to vote on a meme, get the input and execute the voteCall
jQuery("#memeBody").on("click", ".voteBtn", async function(event){
  $("#loader").show();
  //Create two new let block scoped variables, value for the vote input and
  //index to get the index of the meme on which the user wants to vote
  let value = $(this).siblings('input').val(),
      index = event.target.id;

  //Promise to execute execute call for the vote meme function with let values
  await contractCall('voteMeme', [index], value);

  //Hide the loading animation after async calls return a value
  const foundIndex = memeArray.findIndex(meme => meme.index == event.target.id);
  //console.log(foundIndex);
  memeArray[foundIndex].votes += parseInt(value, 10);

  renderMemes();
  $("#loader").hide();
});

//If someone clicks to register a meme, get the input and execute the registerCall
$('#registerBtn').click(async function(){
  $("#loader").show();
  //Create two new let variables which get the values from the input fields
  const name = ($('#regName').val()),
        url = ($('#regUrl').val());

  //Make the contract call to register the meme with the newly passed values
  await contractCall('registerMeme', [url, name], 0);

  //Add the new created memeobject to our memearray
  memeArray.push({
    creatorName: name,
    memeUrl: url,
    index: memeArray.length+1,
    votes: 0,
  })

  renderMemes();
  $("#loader").hide();
});

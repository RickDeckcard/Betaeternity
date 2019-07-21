const contractSource = `
  contract BetBlockchain =

  record bet =
    { creatorAddress  : address,
      category        : string,
      url             : string,
      name            : string,
      betCount        : int }
      
  record state =
    { bets        : map(int, bet),
      betsLength  : int }
  
  entrypoint init() =
    { bets = {},
      betsLength = 0 }
      
  public entrypoint getBet(index : int) : bet =
    switch(Map.lookup(index, state.bets))
      None    => abort("There was no bet with this index registered.")
      Some(x) => x
  
  public stateful entrypoint placeBet(category' : string, url' : string, name' : string) =
    let bet = { creatorAddress = Call.caller, category = category', url = url', name = name', betCount = 0 }
    let index = getBetsLength() + 1
    put(state{ bets[index] = bet, betsLength = index })

  public entrypoint getBetsLength() : int = state.betsLength
      
  public stateful entrypoint voteBet(index : int) =
    let bet = getBet(index)
    Chain.spend(bet.creatorAddress, Call.value)
    let updatedBetCount = bet.betCount + Call.value
    let updatedBets = state.bets{ [index].betCount = updatedBetCount }
    put(state{ bets = updatedBets })
`;
const contractAddress ='ct_2saNoQdaEP7pTkynhCt7M2rABajVBVD8e8RXUjQRz3rveiaSRK';
var client = null;
var betArray = [];
var betsLength = 0;


function renderBets() {
  betArray = betArray.sort(function(a,b){return b.bets-a.bets})
  var template = $('#template').html();
  Mustache.parse(template);
  var rendered = Mustache.render(template, {betArray});
  $('#betBody').html(rendered);
}

//Create a asynchronous read call for our smart contract
async function callStatic(func, args) {
  //Create a new contract instance that we can interact with
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  //Make a call to get data of smart contract func, with specefied arguments
  console.log('function: ', func);
  console.log('argument: ', args);
  const calledGet = await contract.call(func, args, {callStatic: true}).catch(e => console.error(e));
  console.log('calledGet: ', calledGet);
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

  //First make a call to get to know how may bets have been created and need to be displayed
  //Assign the value of bet length to the global variable
  betsLength = await callStatic('getBetsLength', []);

  //Loop over every bet to get all their relevant information
  for (let i = 1; i <= betsLength; i++) {

    //Make the call to the blockchain to get all relevant information on the bet
    const bet = await callStatic('getBet', [i]);

    //Create bet object with info from the call and push into the array with all bets
    betArray.push({
      betCategory: bet.category,
      creatorName: bet.name,
      betUrl: bet.url,
      index: i,
      bets: bet.betCount,
    })
  }

  renderBets();

  $("#loader").hide();

});

//If someone clicks to bet on a registered bet, get the input and execute the betCall
jQuery("#memeBody").on("click", ".betBtn", async function(event){
  $("#loader").show();
  //Create two new let block scoped variables, value for the bet input and
  //index to get the index of the registered bet on which the user wants to bet
  let value = $(this).siblings('input').val(),
      index = event.target.id;

  //Promise to execute execute call for the registered bet function with let values
  await contractCall('voteBet', [index], value);

  //Hide the loading animation after async calls return a value
  const foundIndex = betArray.findIndex(bet => bet.index == event.target.id);
  console.log(foundIndex);
  betArray[foundIndex].bets += parseInt(value, 10);

  renderBets();
  $("#loader").hide();
});

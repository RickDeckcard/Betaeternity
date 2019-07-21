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

//Create a asynchronous write call for our smart contract
async function contractCall(func, args, value) {
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  //Make a call to write smart contract func, with aeon value input
  const calledSet = await contract.call(func, args, {amount: value}).catch(e => console.error(e));
  return calledSet;
}

window.addEventListener('load', async () => {
  client = await Ae.Aepp();
});

//If someone clicks to register a bet, get the input and execute the registerCall
$('#registerBtn').click(async function(){
  $("#loader").show();
  //Create two new let variables which get the values from the input fields
  const category = "soccer",
        name = ($('#regName').val()),
        url = ($('#regUrl').val());

  //Make the contract call to register the bet with the newly passed values
  await contractCall('placeBet', [category, url, name], 0);

  //Add the new created memeobject to our memearray
  betArray.push({
    betCategory: category,
    creatorName: name,
    betUrl: url,
    index: betArray.length + 1,
    bets: 0,
  })

  $("#loader").hide();
});

const fs = require('fs');
const http = require('http');
const fetch = require('node-fetch');
const readline = require('readline');
const express = require('express');
const app = express();
const ejs = require('ejs');
const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '.env') }) 

const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;

/*
Notes from 2023-12-11 at 11:20 PM:

Need to do MongoDB implementation and some HTML fine tuning
Using mongo DB, insert a new record everytime a pokemon is searched for
when the search history is accessed, query 5 most recent searches (not unique)
display sprite, pokemon name, and type(s)
*/


//console.log(userName);
//console.log(password)

app.set('view engine', 'ejs');
app.set('views', __dirname + '/templates');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

if (process.argv.length !== 3) {
  console.log('Usage: node finalServer.js PORT_NUMBER');
  process.exit(1);
}

const portNumber = process.argv[2]

app.get("/", (req, res) => {
    res.render('index.ejs');
});

app.get("/pokemon", (req, res) => {
  res.render('pokemon.ejs');
});

app.post("/pokemonConfirmation", async (req, res) => {
  const d = await getPokemonInfo(req.body.pkmn.toLowerCase());
  let types = `<table border=double><tr><th>Type</th></tr>`
  
  d.types.forEach(type => {
    types += `<tr><td>${type.type.name.charAt(0).toUpperCase() + type.type.name.slice(1)}</td></tr>`
  })
  
  types += "</table>"
  async function main() {
    const uri = `mongodb+srv://${userName}:${password}@cmsc335.nzvnyai.mongodb.net/?retryWrites=true&w=majority`;
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

    try {
        await client.connect();
      
        /* Inserting one movie */
        console.log("\n***** Inserting pkmn search *****");
        let pkmn = {name: req.body.pkmn, sprite: d.sprites.front_default, type: types, time: new Date()};
        await insertPkmn(client, databaseAndCollection, pkmn);

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
  }

  async function insertPkmn(client, databaseAndCollection, pkmn) {
      const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(pkmn);

      console.log(`Application created with id ${result.insertedId}`)
  }
  main().catch(console.error)
  
  if (d == null) {
    res.render('err')
  }
  //console.log(d.moves);

  let stats = `<table border=double><tr><th>Stat</th><th>Value</th></tr>`
  d.stats.forEach(stat => {
    stats += `<tr><td>${stat.stat.name}</td><td>${stat.base_stat}</td></tr>`
  })
  stats += "</table>"

  let counter = 0;

  let moves = `<table border=double><tr><th>Move</th><th>Info</th></tr>`
  
  d.moves.forEach(move => {
    counter += 1
    if (counter < 5) {
      moves += `<tr><td>${move.move.name}</td><td><a href=${move.move.url}>INFO</a></td>`
    }
  })
  
  moves += "</table>"

  

  let abilities = `<table border=double><tr><th>Ability Name</th><th>Hidden?</th></tr>`
  
  d.abilities.forEach(ability => {
    abilities += `<tr><td>${ability.ability.name.charAt(0).toUpperCase() + ability.ability.name.slice(1)}</td><td>${ability.is_hidden}</td></tr>`
  })
  
  abilities += "</table>"

  let misc = `<table border=double><tr><th>Attribute</th><th>Value</th></tr>`
  misc += `<tr><td>Weight</td><td>${d.weight}</td></tr>`
  misc += `<tr><td>Base EXP</td><td>${d.base_experience}</td></tr>`
  misc += `<tr><td>Height</td><td>${d.height}</td></tr>`
  misc += "</table>"


  res.render('pokemonConfirmation', {
    pkmnName: req.body.pkmn.charAt(0).toUpperCase() + req.body.pkmn.slice(1), 
    pkmnSprite: d.sprites.front_default,
    pkmnStats: stats,
    pkmnMoves: moves,
    pkmnTypes: types,
    pkmnAbilities: abilities,
    pkmnMisc: misc
  })
});

app.get("/history", (req, res) => {
  console.log("entering history block")
  async function main() {
    const uri = `mongodb+srv://${userName}:${password}@cmsc335.nzvnyai.mongodb.net/?retryWrites=true&w=majority`;
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

   
    try {
        await client.connect();
        console.log("***** Looking up PKMN History *****");
        const result = await lookUpMany(client, databaseAndCollection);
        
        if (result) {
          tabledata = `<table border=double><tr><th>Name</th><th>Name</th><th>Type(s)</th></tr>
          ${result.map(item=> `
          <tr>
            <td><img src="${item.sprite}"</td>
            <td>${item.name.charAt(0).toUpperCase() + item.name.slice(1)}</td>
            <td>${item.type}</td>
          </tr>
          `).join('')}
          </table>
          `
          res.render('history', {
            pkmnHistory: tabledata
          })
        }
        
       console.log("completed history retrieval")
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function lookUpMany(client, databaseAndCollection) {
    //let filter = {gpa : { $gte: gpa}};
    const cursor = client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .find().sort({time: -1}).limit(5);

    // Some Additional comparison query operators: $eq, $gt, $lt, $lte, $ne (not equal)
    // Full listing at https://www.mongodb.com/docs/manual/reference/operator/query-comparison/
    const result = await cursor.toArray();
    //console.log(result);
    return result
}

main().catch(console.error);

  //res.render('index.ejs');
});

async function getPokemonInfo(pokemonName) {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
    if (!response.ok) {
      return null;
      //throw new Error('Pokemon not found');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    //console.error(error.message);
    throw new Error('Error fetching Pokemon data');
  }
}

const server = app.listen(portNumber, () => {
  //console.log(`\nSummerCamp server is running at http://localhost:${portNumber}\n`);
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.setPrompt('Type stop to shutdown the server: ');
rl.prompt();

rl.on('line', (input) => {
  if (input.trim() === 'stop') {
    console.log('Shutting down the server');
    rl.close();
    server.close(() => {
      process.exit(0);
    });
  }
  //rl.prompt();
});
const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
let db = null

const path = require('path')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'twitterClone.db')

const initializeTheServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server running....')
    })
  } catch (err) {
    console.log(`db error: ${err.message}`)
    process.exit(-1)
  }
}

initializeTheServer()

// const convertStateToCamelCase = dbObject => {
//   return {
//     stateId: dbObject.state_id,
//     stateName: dbObject.state_name,
//     population: dbObject.population,
//   }
// }
// const convertDistrictToCamelCase = dbObject => {
//   return {
//     districtId: dbObject.district_id,
//     stateId: dbObject.state_id,
//     districtName: dbObject.district_name,
//     cases: dbObject.cases,
//     cured: dbObject.cured,
//     active: dbObject.active,
//     deaths: dbObject.deaths,
//   }
// }

/// jwttoken---eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImNocmlzdG9waGVyX3BoaWxsaXBzIiwiaWF0IjoxNzI1Njg3NDc0fQ.7OXgkM-STKqquxnFdtMLQA8Vba-BNpSV72YojtHBdzE

const authenticateToken = async (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    console.log('firstone')
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'Myangryangel', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
        console.log('firstone second')
      } else {
        console.log(payload)
        request.username = payload.username
        next()
      }
    })
  }
}

// app.post('/register/', async (request, response) => {
//   const {username, password, name, gender} = request.body
//   const selectedUser = `SELECT * FROM user WHERE username = '${username}' ;`
//   const dbUser = await db.get(selectedUser)

//   if (dbUser !== undefined) {
//     response.status(400)
//     response.send('User already exists')
//   } else {
//     if (password.length < 6) {
//       response.status(400)
//       response.send('Password is too short')
//     } else {
//       const hashedPassword = await bcrypt.hash(request.body.password, 10)
//       const createUserQuery = `INSERT INTO user (username, password, name, gender)
//       VALUES (
//         '${username}',
//         ${hashedPassword},
//         ${name},
//         ${gender}

//       );`
//       await db.run(createUserQuery)
//       response.send('User created successfully')
//     }
//   }
// })
app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body

  const selectedUserQuery = `SELECT * FROM user WHERE username = '${username}';`
  const dbUser = await db.get(selectedUserQuery)

  if (dbUser === undefined) {
    //create user
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const hashedPassword = await bcrypt.hash(password, 10)
      const createUserQuery = `INSERT INTO user (username, name, password, gender)
                    VALUES(
                        '${username}',
                        '${name}',
                        '${hashedPassword}',
                        '${gender}'
                        
                    );`

      await db.run(createUserQuery)
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    //username already exists
    response.status(400)
    response.send('User already exists')
  }
})
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectedUser = `SELECT * FROM user WHERE username = '${username}' ;`
  const dbUser = await db.get(selectedUser)

  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordsMatched = await bcrypt.compare(password, dbUser.password)

    if (isPasswordsMatched === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'Myangryangel')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//get tweet details
app.get('/user/tweets/feed/', authenticateToken, async (request, response) => {
  const username = request.username
  const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${username}';`
  const getUserId = await db.get(getUserIdQuery)
  console.log(getUserId)
  const getTweetDeatailsQuery = `SELECT * FROM follower WHERE  follower_user_id = ${getUserId.user_id}; `
  const tweetDetails = await db.all(getTweetDeatailsQuery)
  console.log(tweetDetails)
  let newObj = {}
  for (let eachObj of tweetDetails) {
    let getTweets = `SELECT 
      user.username,
      tweet.tweet,
      tweet.date_time
    FROM user NATURAL JOIN tweet 
    WHERE user.user_id =  ${eachObj.following_user_id} 
      ;`
    let result = await db.get(getTweets)
    console.log(result)
  }
})

// JWT TOKEN ---eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkpvZUJpZGVuIiwiaWF0IjoxNzI2MDI2ODQzfQ.CRtIe4zH54VaL7pssGzYXO0WcCAqmmnOAMReEbl0aJQ
// module.exports = app

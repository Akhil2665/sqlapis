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

const convertToCamelCase = dbObject => {
  return {
    userId: dbObject.user_id,
    username: dbObject.username,
    name: dbObject.name,
    password: dbObject.password,
    gender: dbObject.gender,
    followerId: dbObject.follower_id,
    followerUserId: dbObject.follower_user_id,
    tweetId: dbObject.tweet_id,
    tweet: dbObject.tweet,
    dateTime: dbObject.date_time,
    replyId: dbObject.reply_id,
    reply: dbObject.reply,
    likeId: dbObject.like_id,
  }
}
const convertnameToCamelCase = dbObject => {
  return {
    name: dbObject.username,
  }
}

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
  try {
    const usernameLogged = request.username
    const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${usernameLogged}';`
    const getUserId = await db.get(getUserIdQuery)
    // console.log(getUserId)

    const getTweetDeatailsQuery = `SELECT following_user_id FROM follower WHERE  follower_user_id = ${getUserId.user_id}; `
    const tweetDetails = await db.all(getTweetDeatailsQuery)
    // console.log(tweetDetails)

    const followingIds = tweetDetails.map(eachObj => eachObj.following_user_id)
    // console.log(followingIds)

    const getQuery = `SELECT username, tweet, date_time FROM user 
        INNER JOIN tweet  ON user.user_id = tweet.user_id
        WHERE tweet.user_id IN (${followingIds}) 
        ORDER BY date_time DESC
        LIMIT 4;`

    const dbResponse = await db.all(getQuery)

    response
      .status(200)
      .send(dbResponse.map(eachObj => convertToCamelCase(eachObj)))
  } catch (err) {
    response.status(500).send('Server Error')
  }
})
//user following list API
app.get('/user/following/', authenticateToken, async (request, response) => {
  try {
    const usernameLogged = request.username
    const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${usernameLogged}';`
    const getUserId = await db.get(getUserIdQuery)

    const getTweetDeatailsQuery = `SELECT following_user_id FROM follower WHERE  follower_user_id = ${getUserId.user_id}; `
    const tweetDetails = await db.all(getTweetDeatailsQuery)

    const followingIds = tweetDetails.map(eachObj => eachObj.following_user_id)
    // console.log(followingIds)

    const getQuery = `SELECT DISTINCT name  FROM user 
        INNER JOIN tweet  ON user.user_id = tweet.user_id
        WHERE tweet.user_id IN (${followingIds}) ;`

    const dbResponse = await db.all(getQuery)

    response
      .status(200)
      .send(dbResponse.map(eachObj => convertToCamelCase(eachObj)))
  } catch (err) {
    response.status(500).send('Server error')
  }
})
//user followers list API
app.get('/user/followers/', authenticateToken, async (request, response) => {
  try {
    const usernameLogged = request.username
    const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${usernameLogged}';`
    const getUserId = await db.get(getUserIdQuery)

    const getTweetDeatailsQuery = `SELECT follower_user_id FROM follower WHERE  following_user_id = ${getUserId.user_id}; `
    const tweetDetails = await db.all(getTweetDeatailsQuery)
    // console.log(tweetDetails)updated

    const followingIds = tweetDetails.map(eachObj => eachObj.follower_user_id)
    // console.log(followingIds)

    const getQuery = `SELECT DISTINCT name  FROM user 
        INNER JOIN tweet  ON user.user_id = tweet.user_id
        WHERE tweet.user_id IN (${followingIds}) ;`

    const dbResponse = await db.all(getQuery)

    response
      .status(200)
      .send(dbResponse.map(eachObj => convertToCamelCase(eachObj)))
  } catch (err) {
    response.status(500).send('Server error')
  }
})
//get the perticular tweet details
app.get('/tweets/:tweetId/', authenticateToken, async (request, response) => {
  try {
    const {tweetId} = request.params
    const usernameLogged = request.username
    const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${usernameLogged}';`
    const getUserId = await db.get(getUserIdQuery)

    const getTweetDeatailsQuery = `SELECT following_user_id FROM follower WHERE  follower_user_id = ${getUserId.user_id}; `
    const tweetDetails = await db.all(getTweetDeatailsQuery)

    const followingIds = tweetDetails.map(eachObj => eachObj.following_user_id)
    // console.log(followingIds)
    // const getTweetId = `SELECT`
    // if ()

    const getQuery = `SELECT tweet,COUNT(DISTINCT like_id) AS likes, COUNT(DISTINCT reply_id) as replies,tweet.date_time as dateTime
     FROM (
      tweet INNER JOIN reply ON tweet.tweet_id = reply.tweet_id) AS T
      INNER JOIN like ON T.tweet_id = like.tweet_id
        WHERE tweet.user_id IN (${followingIds}) and tweet.tweet_id = ${tweetId} ;`

    const dbResponse = await db.get(getQuery)
    console.log(dbResponse.tweet)
    if (dbResponse.tweet === null) {
      response.status(401).send('Invalid Request')
    } else {
      response.status(200).send(dbResponse)
    }
  } catch (err) {
    response.status(500).send('Server error')
  }
})
// API 7
app.get(
  '/tweets/:tweetId/likes/',
  authenticateToken,
  async (request, response) => {
    try {
      const {tweetId} = request.params
      const usernameLogged = request.username
      const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${usernameLogged}';`
      const getUserId = await db.get(getUserIdQuery)

      const getTweetDeatailsQuery = `SELECT following_user_id FROM follower WHERE  follower_user_id = ${getUserId.user_id}; `
      const tweetDetails = await db.all(getTweetDeatailsQuery)

      const followingIds = tweetDetails.map(
        eachObj => eachObj.following_user_id,
      )

      // console.log(followingIds)
      // const getTweetId = `SELECT`
      // if ()

      const getQuery = `SELECT DISTINCT like.user_id
     FROM (
      tweet INNER JOIN reply ON tweet.tweet_id = reply.tweet_id) AS T
      INNER JOIN like ON T.tweet_id = like.tweet_id
        WHERE tweet.user_id IN (${followingIds}) and tweet.tweet_id = ${tweetId} ;`

      const likeUsersResponse = await db.all(getQuery)
      const likesUserIds = likeUsersResponse.map(eachObj => eachObj.user_id)
      console.log(likesUserIds)

      const userNamesQuery = `SELECT username FROM user WHERE user_id IN (${likesUserIds});`
      const usernamesResponse = await db.all(userNamesQuery)
      console.log(usernamesResponse)
      const nameslist = usernamesResponse.map(eachObj => eachObj.username)
      console.log(nameslist)
      if (nameslist.length === 0) {
        response.status(401).send('Invalid Request')
      } else {
        response.status(200).send({likes: nameslist})
      }
    } catch (err) {
      response.status(500).send('Server error')
    }
  },
)

// API 8
app.get(
  '/tweets/:tweetId/replies/',
  authenticateToken,
  async (request, response) => {
    try {
      const {tweetId} = request.params
      const usernameLogged = request.username
      const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${usernameLogged}';`
      const getUserId = await db.get(getUserIdQuery)

      const getTweetDeatailsQuery = `SELECT following_user_id FROM follower WHERE  follower_user_id = ${getUserId.user_id}; `
      const tweetDetails = await db.all(getTweetDeatailsQuery)

      const followingIds = tweetDetails.map(
        eachObj => eachObj.following_user_id,
      )

      const getQuery = `SELECT DISTINCT reply.user_id
        FROM 
        tweet INNER JOIN reply ON tweet.tweet_id = reply.tweet_id 
        WHERE tweet.user_id IN (${followingIds})  ;`

      const replyUsersResponse = await db.all(getQuery)
      // console.log(replyUsersResponse)
      const replyUserIds = replyUsersResponse.map(eachObj => eachObj.user_id)
      // console.log(replyUserIds)

      const getReplyQuery = `SELECT name, reply
        FROM reply 
        INNER JOIN user
            ON user.user_id = reply.user_id
        WHERE reply.user_id IN (${replyUserIds}) AND reply.tweet_id = ${tweetId};`
      const replyResponse = await db.all(getReplyQuery)
      // console.log(replyResponse)

      if (replyResponse === []) {
        response.status(401).send('Invalid Request')
      } else {
        response.status(200).send({replies: replyResponse})
      }
    } catch (err) {
      response.status(500).send('Server error')
    }
  },
)

//get login user tweets API 9
app.get('/user/tweets/', authenticateToken, async (request, response) => {
  try {
    const usernameLogged = request.username
    const {tweet} = request.body
    const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${usernameLogged}';`
    const getUserId = await db.get(getUserIdQuery)

    const createTweetQuery = `INSERT INTO tweet (tweet,user_id,date_time)
      VALUES (
        '${tweet}',
        ${getUserId.user_id},
        '${new Date()}'
      )
      ;`

    const dbResponse = await db.run(createTweetQuery)
    console.log(dbResponse.tweet)

    if (dbResponse.tweet === null) {
      response.status(401).send('Invalid Request')
    } else {
      response.status(200).send('Created a Tweet')
    }
  } catch (err) {
    response.status(500).send('Server error')
  }
})

//API10 Creating new tweet of a user
app.post('/user/tweets/', authenticateToken, async (request, response) => {
  try {
    const {tweet} = request.body
    const usernameLogged = request.username
    const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${usernameLogged}';`
    const getUserId = await db.get(getUserIdQuery)
    const presentDate = new Date()

    const createTweetQuery = `INSERT INTO tweet(tweet, user_id, date_time)
		VALUES(
      '${tweet}',
       ${getUserId.user_id},
      '${presentDate}'

			)
      ;`

    const dbRes = await db.run(createTweetQuery)

    if (tweet === null) {
      response.status(400).send('Invalid Request')
    } else {
      response.status(200).send('Created a Tweet')
    }
  } catch (err) {
    response.status(500).send('Server error')
  }
})
//API--11 delete tweet
app.delete(
  '/tweets/:tweetId/',
  authenticateToken,
  async (request, response) => {
    try {
      const {tweetId} = request.params
      const usernameLogged = request.username

      const getUserIdQuery = `SELECT user_id FROM user WHERE username = '${usernameLogged}';`
      const getUserId = await db.get(getUserIdQuery)

      const userTweetsQuery = `SELECT tweet_id FROM tweet WHERE user_id = ${getUserId.user_id};`
      const userTweeetResponse = await db.all(userTweetsQuery)
      const userTweeetIds = userTweeetResponse.map(eachObj => eachObj.tweet_id)

      let deleteQuery
      let cndn = userTweeetIds.includes(parseInt(tweetId))

      if (cndn) {
        deleteQuery = `DELETE FROM tweet WHERE tweet_id = ${tweetId}`
        await db.run(deleteQuery)
        response.status(200).send('Tweet Removed')
      } else {
        response.status(401).send('Invalid Request')
      }
    } catch (err) {
      response.status(500).send('Server error')
    }
  },
)
// sdasdhjhsjkdajdadsadaddesAPI910 all api's completed 3 test cases faild
// JWT TOKEN ---eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkpvZUJpZGVuIiwiaWF0IjoxNzI2MDI2ODQzfQ.CRtIe4zH54VaL7pssGzYXO0WcCAqmmnOAMReEbl0aJQ
module.exports = app

const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to DBsuccessfully');
  })
  .catch(err => {
    console.error(err);
  });
;

const userSchema = mongoose.Schema({
  username: {
    type: String,
    unique: true,
  },
}, {
  versionKey: false,
});
const User = mongoose.model("User", userSchema);

const excerciseSchema = mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date,
  userId: String,
}, {
  versionKey: false,
});
const Exercise = mongoose.model("Exercise", excerciseSchema);

app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// GET request for all users
app.get("/api/users", async (req, res) => {
  const users = await User.find();
  res.send(users);
});

// GET request for logs
app.get("/api/users/:_id/logs", async (req, res) => {
  let { from, to, limit } = req.query;
  const userId = req.params._id;

  let foundUser;

  try {
    foundUser = await User.findById(userId);
  } catch (err) {
    foundUser = null;
  }

  if (!foundUser) {
    return res.status(400).json({
      message: "No user found",
    });
  }

  let filter = { userId };
  let dateFilter = {};

  if (from) {
    dateFilter["$gte"] = new Date(from);
  }

  if (to) {
    dateFilter["$lte"] = new Date(to);
  }

  if (from || to) {
    filter.date = dateFilter;
  }

  if (!limit) {
    limit = 100;
  }

  try {
    let excersises = await Exercise.find(filter).limit(limit);

    if (!excersises.length) {
      return res.status(400).json({
        message: 'No excersises fall under those criteria'
      });
    }

    excersises.map(excersise => {
      return {
        description: excersise.description,
        duration: excersise.duration,
        date: excersise.date.toDateString(),
      }
    });

    if (excersises.length) {
      return res.json({
        username: foundUser.username,
        counter: excersises.length,
        _id: userId,
        log: excersises,
      });
    }
  } catch (err) {
    return res.status(400).json({
      message: 'There was error fetching excersises'
    });
  }

});


//  POST to /api/users username
app.post("/api/users", async (req, res) => {
  const username = req.body.username
  const userFound = await User.findOne({ username });

  if (userFound) {
    return res.status(400).json({
      message: 'User with that username already exists, please use a different one'
    })
  }

  if (username === '') {
    return res.status(400).json({
      message: 'Username cannot be empty'
    })
  }

  const user = await User.create({
    username
  });

  return res.status(201).json(user);
})

// POST to /api/users/:_id/excersises
app.post("/api/users/:_id/exercises", async (req, res) => {
  let { description, duration, date } = req.body;

  const userId = req.body[':_id'];

  let foundUser;

  try {
    foundUser = await User.findById(userId);
  } catch (err) {
    foundUser = null;
  }

  if (!foundUser) {
    return res.status(400).json({
      message: 'No user exists with that id'
    });
  }

  if (!description) {
    return res.status(400).json({
      message: 'Please enter a valid description'
    });
  }

  if (!duration || isNaN(duration)) {
    return res.status(400).json({
      message: 'Please enter a valid duration'
    });
  }

  if (!date || !isDateValid(date)) {
    return res.status(400).json({
      message: 'Please enter a valid date'
    });
  }

  date = new Date(date);

  try {
    await Exercise.create({
      username: foundUser.username,
      description,
      duration,
      date,
      userId,
    });
  } catch (err) {
    return res.status(400).json({
      message: 'There was an error creating the excersise',
    })
  }

  res.send({
    username: foundUser.username,
    description,
    duration,
    date: date.toDateString(),
    _id: userId,
  });
});


function isDateValid(dateString) {
  const date = new Date(dateString);

  return date instanceof Date && !isNaN(date);
}

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

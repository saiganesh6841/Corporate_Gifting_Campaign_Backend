let mongoose = require('mongoose');

let chatSchema = mongoose.Schema({
  sessionId:{
    type:String,
    default:""
  }, // for chat from(sender) and to(receiver)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  title:{
    type:String,
    default:""
  },
  chat:[
    {
      message:String,
      messageType:{
        type:String,
        default:"text"
      },// it will be like text,image,video, link(websitelink), file
      userType:{
        type:String,
        default:"sender"
      }, // it will be sender and receiver , will make left side receiver and right side sender
      updatedAt: {
        type: Number,
        default: () => Math.floor(Date.now() / 1000),
      },
    }
  ],

  // operatedBy: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: "User",
  // },
  updatedAt: {
    type: Number,
    default: () => Math.floor(Date.now() / 1000),
  },
  createdAt: {
    type: Number,
    default: () => Math.floor(Date.now() / 1000),
  }
}, {
  // this block will use when do we need to specify collection name. collection name should be case sensitive
  //otherwise model plural name consider as collection name
  collection: 'chats'
});

module.exports = mongoose.model('Chat', chatSchema);

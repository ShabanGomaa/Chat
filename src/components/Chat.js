import React, { Component } from 'react';
import io from 'socket.io-client'
const socketUrl = "http://localhost:3231/";
var nano = require('nano')('http://localhost:5984'); // Connect to the CouchDB running on port 5984

var db_name = 'chatdb'; // The name of the database to connect to
var db = nano.use(db_name);

class Chat extends Component {
    constructor(props) {
        super(props);
        this.state = {
            messages: [],
            users: []
        };

        this.handleMessageChange = this.handleMessageChange.bind(this);
        this.handleUserChange = this.handleUserChange.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.sendMessageEvent = this.sendMessageEvent.bind(this);
        this.appendMessage = this.appendMessage.bind(this);
        this.userTyping = this.userTyping.bind(this);        
        this.init = this.init.bind(this);
        this.socket = io(socketUrl);
    }    

    // When component mount
    componentDidMount() {
        this.init();
        this.getData();
    }

    // Initialize the component
    init = () => {        
        const { messages } = this.state;
        this.socket.on('chat-message', function (response) {
            messages.push(response.message);
            this.setState({ messages: messages })
            this.appendMessage(response.user, response.message);
            var res = this.isUser(this.state.users, response.user);
            if (res === false) {
                this.state.users.push(response.user);
                this.appendUser(response.user);
            }
            this.refs.messagesListInput.scrollTop = this.refs.messagesListInput.scrollHeight;
        }.bind(this));

        this.socket.on('user-typing',function(response){
            this.refs.feedbackRef.innerHTML = "<p><em>"+response.user+' is typing a message...</em></p>';
        });
    }

    render() {
        return (
            <div className="container">
                <div className="row">
                    <div className="col-sm-3">
                        <ul id='listUsers' className="messages divMessages">
                        </ul>
                    </div>
                    <div className="col-sm-9">                                             
                        <div className="row">
                            <ul id='listMessages' className="messages divMessages" ref="messagesListInput">
                            </ul>
                        </div>
                        <div className="row">
                            <div id="feedback" ref="feedbackRef"></div>  
                            <input type="text" ref="usernameRef" id="username" className="userName" placeholder="Type your name here" onChange={this.handleUserChange}></input>
                        </div>
                        <div className="row">                            
                            <input type="text" id="message" className="inputMessage" placeholder="Type your message here" 
                            onChange={this.handleMessageChange} onKeyDown={this.sendMessageEvent} onKeyPress={this.userTyping} ref="messageInput"></input>
                            <input type="button" className="button btn btn-primary btn-lg" id="btnSend" onClick={this.sendMessage} 
                            value="Send"></input>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Set the state in case user name input is changed
    handleUserChange(event) {
        this.setState({ user: event.target.value })
    }

    // Set the state in case message input is changed
    handleMessageChange(event) {
        this.setState({ message: event.target.value })
    }

    // Send message and inform the server that new message is coming with adding the message to the database
    sendMessage() {
        this.socket.emit('chat-message', { 'message': this.state.message, 'user': this.state.user });
        this.insertDocToDatabase(this.state.user, this.state.message);
        this.refs.messageInput.value = '';
        this.refs.messageInput.focus();
        this.refs.messagesListInput.scrollTop = this.refs.messagesListInput.scrollHeight;
        this.refs.feedbackRef.innerHTML = '';
    }

    // Handle the send message event from input
    sendMessageEvent(event) {
        if (event.key === "Enter") {
            this.sendMessage();
        }
    }

    // The user is typing a message
    userTyping()
    {        
        this.socket.emit('user-typing', {'user': this.refs.usernameRef.value});
    }

    // Add message to list of messages
    appendMessage(user, msg) {
        if (user === null || user === 'undefined' || msg === null || msg === 'undefined') {
            return;
        }
        var ul = document.getElementById("listMessages");
        var li = document.createElement("li");
        var item = '<div><span class="username">user: </span>'
        item += '<span class="messageBody">msg</span></div>'
        
        var userSpan = document.createElement("span");
        userSpan.setAttribute('class', 'userbody');
        userSpan.appendChild(document.createTextNode(user+": "))
        li.appendChild(userSpan);

        var messageSpan = document.createElement("span");
        messageSpan.setAttribute('class', 'message');
        messageSpan.appendChild(document.createTextNode(msg))
        li.appendChild(messageSpan);

        ul.appendChild(li);
    }

    // Check user exists in the list of current users
    isUser(userList, user) {
        var res = userList.some(item => item === user)
        return res;
    }

    // Append the user to list of current users in case s/he is not exists
    appendUser(user) {
        if (user === null || user === 'undefined') {
            return;
        }
        var ul = document.getElementById("listUsers");
        var li = document.createElement("li");
        var link = document.createElement("a");
        link.href = '';
        link.text = user;
        li.appendChild(link);
        ul.appendChild(li);
    }

    // Get the list of messages and users from database
    // The data is inserted as set of documents
    getData() {
        var ul = document.getElementById("listUsers");
        ul.innerHTML = null;
        ul = document.getElementById("listMessages");
        ul.innerHTML = null;

        var userList = []
        db.list({ include_docs: true,descending:true }, function (err, body) {
            if (!err) {
                body.rows.forEach(function (doc) {
                    if (doc.doc.User !== null && doc.doc.User !== 'undefined' && doc.doc.Message !== null && doc.doc.Message !== 'undefined') {
                        this.appendMessage(doc.doc.User, doc.doc.Message);
                        var res = this.isUser(userList, doc.doc.User);
                        if (res === false) {
                            userList.push(doc.doc.User);
                            this.appendUser(doc.doc.User);
                        }
                    }
                }.bind(this));
            }
            this.setState({ users: userList });
        }.bind(this));
    }

    // Inset a document to the database
    insertDoc(doc) {
        db.insert(doc);
    }

    // Format the user and message to a document with adding to database
    insertDocToDatabase(user, message) {
        var doc = JSON.parse('{"Message"' + ':"' + message + '", "User":"' + user + '" }');
        if (user === null || user === 'undefined' || message === null || message === 'undefined') {
            return;
        }
        this.insertDoc(doc);
    }
}

export default Chat;
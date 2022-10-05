//* 가장 간단한 서버를 만들 것입니다
//* 모든 데이터나 상태는 서버가 실행되는 동안에만 메모리에 존재합니다.
// import { createServer } from "http";
// import { Server, Socket } from "socket.io";

import { Socket } from "socket.io";

type User = {
    userName: string;
    password: string;
};

//* https://stackoverflow.com/questions/30840596/how-to-do-dynamic-objects-in-typescript
const users : { [userName: string] : User } = {};

type Room = {
    roomName: string;
    description: string;
    creater: string;
    private: boolean;
    users:  { [userName: string] : User };
    maxPeople: number;

};

const rooms: { [roomName: string] : Room }  = {};

// const httpServer = createServer();
const io = require("socket.io")(require("http").createServer(function(){}).listen(80));

io.on("connection", (socket: Socket) => {
    console.log("Connection established with a client");
    

    socket.on('validate', (inData: User, inCallback: Function) => {
        console.log("Message validating in progress...");
        console.log(`inData: ${JSON.stringify(inData)}`);
        
        const user = users[inData.userName];
        console.log(`user: ${JSON.stringify(user)}`);

        if (user) {
            if (user.password == inData.password) {
                console.log("User logged in");
                inCallback({status : "ok" });
            } else {
                console.log("Password incorrect");
                inCallback({ status : "fail"});
            }
        } else {
            console.log("User creating in progress...");
            users[inData.userName] = inData;
            console.log(`users: ${JSON.stringify(users)}`);
            //* 서버에서 새로운 사용자가 생겼을음 서버에 연결된 모든 클라이언트에게 알리는 것
            socket.broadcast.emit("newUser", users);
            //* 두번째 인수를 받아 앱은 화면에서 users를 업데이트한다
            inCallback({ status : "created" });
        }
    });

    socket.on("create",  (inData: Room, inCallback: Function) => {
        if (rooms[inData.roomName]) {
            console.log("Room already exists");
            inCallback({status : "exists" });
        } else {
            console.log("Room creating in progress...");
            inData.users = {};
            console.log(`inData: ${JSON.stringify(inData)}`);
            rooms[inData.roomName] = inData;
            console.log(`rooms: ${JSON.stringify(rooms)}`);
            socket.broadcast.emit("created", rooms);
            inCallback({ status : "created", rooms : rooms });
    } 

    socket.on("listRooms", (inData, inCallback) => {
        //* 사용자가 처음으로 로비 화면에 갈 때의 한 가지 경우에만 필요하다
        inCallback(rooms);
    });

    socket.on("listUsers", (inData, inCallback) => {
        //* 클라이언트는 서버에 사용자 리스트를 유지하고 새 사용자가 만들어질 때마다 알림을 받는다
        console.log("users: " + JSON.stringify(users));
        inCallback(rooms);
    });

    //* 대화방을 만들고 나열할 수 있게 되었으므로, 대화방에 입장하거나 참가할 수 있다.
    socket.on("join", (inData: {userName: string, roomName: string}, inCallback: Function) => {
        const room = rooms[inData.roomName];
        if (Object.keys(room.users).length  >= room.maxPeople) {
            console.log("Room is full");
            inCallback({ status : "full" });
        } else {
            room.users[inData.userName] = users[inData.userName];
            socket.broadcast.emit("joined", room);
            inCallback({status : "joined", room : room });
        }

    });

    socket.on("post",(inData, inCallback) => {
        //* 실제로 메시지를 저장하지 않기 때문에 posted 메시지를 연결엔 모든 클라이언트에 브로드캐스트로 중계하기만 하면 된다
        socket.broadcast.emit("posted", inData);
        inCallback({ status : "Message posted." });
    });

    socket.on("invite", (inData: User, inCallback: Function) => {
        //* 분명 특정 사용자를 위한 것이지만 서버는 특정 사용자의 소켓을 식별할 방법이 없다
        //* 따라서 모든 클라이언트에게 브로드캐스트되는데
        //* 반응하는 것은 inData에 포함된 특정 userName의 한 명만 반응한다
        socket.broadcast.emit("invited", inData);
        inCallback({ status : "Ok" });
    });

    socket.on("leave",(inData, inCallback) => {
        const room = rooms[inData.roomName];
        delete room.users[inData.userName];
    });

    socket.on("close",(inData, inCallback) => {
       //* 대화방 만든 사람만 사용할 수 있는 기능 
       delete rooms[inData.roomName];
       //* closed 메시지를 클라이언트에 브로드캐스트하고 새로운 객체를 넘긴다
       socket.broadcast.emit("closed", { roomName: inData.roomName, rooms: rooms});
    });

    socket.on("kick",(inData, inCallback) => {
        const room = rooms[inData.roomName];
        const users = room.users;
        delete users[inData.userName];
        socket.broadcast.emit("kicked", room);
        inCallback({status: "ok"});
    });





    });

});


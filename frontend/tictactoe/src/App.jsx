import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from "socket.io-client";
import { FaRegCircle } from "react-icons/fa";
import { RxCross2 } from "react-icons/rx";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
export default function App() {
  const socket = useRef(null);
  const [boxes, setBoxes] = useState(Array(9).fill(-1));
  const [stage, setStage] = useState(1);
  const [name, setName] = useState("");
  const [chance, setChance] = useState(false);
  const [xo, setXo] = useState(false);
  const [gameOver, setGameOver] = useState(null);
  const [opponentName, setOpponentName] = useState("");

  useEffect(() => {
    if (stage === 2 && chance) {
      toast("It's your Turn");
    }
  }, [chance, stage]);

  useEffect(() => {
    socket.current = io("https://ticntoe.onrender.com");

    socket.current.on("wait", () => {
      setStage(-1);
    });

    socket.current.on("start", ({ chance, xo, friendName }) => {
      setStage(2);
      setChance(chance);
      setXo(xo);
      setOpponentName(friendName);
    });

    socket.current.on("start2", ({ board, chance }) => {
      setBoxes(board);
      setChance(chance);
    });

    socket.current.on("gameOver", ({ winner }) => {
      setGameOver(winner);
    });

    socket.current.on("restartGame", () => {
      setBoxes(Array(9).fill(-1));
      setGameOver(null);
      setChance(false);
      setStage(1);
      setOpponentName("");
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  const handleFormSubmit = useCallback((e) => {
    e.preventDefault();
    socket.current.emit("submitName", { name });
  }, [name]);

  const runClick = useCallback((i) => {
    if (chance && boxes[i] === -1) {
      socket.current.emit("clickOnBtn", { index: i + 1, xo });
    }
  }, [chance, xo, boxes]);

  const restartGame = () => {
    socket.current.emit("restartGame");
  };

  let gameContent;

  if (gameOver !== null) {
    const message = gameOver === -1 ? "It's a Draw!" : (gameOver === xo ? "You Won!" : "You Lost!");
    const imgSrc = gameOver === xo
      ? "https://www.icegif.com/wp-content/uploads/2023/07/icegif-132.gif"
      : "https://media.tenor.com/fAw8OmhI1WYAAAAj/game-over-game.gif";

    gameContent = (
      <div className='h-[97vw] w-[97vw] lg:h-[30vw] lg:w-[30vw] customcolor rounded-3xl p-2 flex flex-wrap items-center justify-center text-xl flex-col'>
        <div className='flex justify-evenly items-center font-bold'>
          <span className='lg:text-5xl text-3xl font-[Comic_Sans] text-white'>{message}</span>
        </div>
        <img src={imgSrc} alt="Game Outcome" className='w-1/2 rounded-xl mt-4' />
        <button onClick={restartGame} className='mt-4 px-3 py-2 text-white bg-black text-md rounded-full'>Restart Game</button>
      </div>
    );
  } else if (stage === 1) {
    gameContent = (
      <form onSubmit={handleFormSubmit} className='h-[97vw] w-[97vw] lg:h-[30vw] lg:w-[30vw] customcolor rounded-3xl p-8 flex flex-wrap items-center justify-center'>
        <div className='flex justify-evenly items-center font-bold'>
          <img src="https://cdn-icons-png.flaticon.com/512/10199/10199746.png" alt="chess" className='w-1/5' />
          <span className='lg:text-5xl text-3xl font-[Comic_Sans] text-white'>TicnToe</span>
        </div>
        <span className='w-full flex items-center justify-center flex-col'>
          <label htmlFor="name" className='font-semibold text-center p-1 text-white text-xl'>Enter Your Name</label>
          <input id="name" type="text" value={name} onChange={(e) => { setName(e.target.value); }} className='w-3/4 h-10 rounded-full px-4 bg-violet-50 text-center' />
        </span>
        <button type="submit" className='h-max p-4'>Enter Game</button>
      </form>
    );
  } else if (stage === 2) {
    gameContent = (
      <div className='relative h-[97vw] w-[97vw] lg:h-[30vw] lg:w-[30vw] customcolor rounded-3xl p-2 flex flex-wrap'>
        <div className="absolute -top-10 p-1 left-0 transform text-md text-black font-semibold">
          Opponent: <span className='font-bold'> {opponentName}</span>
        </div>
        <div className="absolute -bottom-10 p-1 right-0 transform text-md text-black font-semibold">
          You: <span className='font-bold'>  {name}</span>
        </div>
        {boxes.map((v, i) => (
          <div key={i} className="w-1/3 h-1/3 p-1.5 rounded-3xl">
            <button
              onClick={() => { runClick(i); }}
              className='w-full h-full flex items-center justify-center bg-blue-50 hover:border-black rounded-3xl'
              disabled={boxes[i] !== -1}
            >
              {boxes[i] > -1 && (boxes[i] === 0 ? <FaRegCircle className='text-black text-[4rem]' /> : <RxCross2 className='text-black text-[4rem]' />)}
            </button>
          </div>
        ))}
      </div>
    );
  } else if (stage === -1) {
    gameContent = (
      <div className='h-[97vw] w-[97vw] lg:h-[30vw] lg:w-[30vw] customcolor rounded-3xl p-2 flex flex-wrap items-center justify-center text-xl'>
        <div className='flex justify-evenly items-center font-bold'>
          <img src="https://cdn-icons-png.flaticon.com/512/10199/10199746.png" alt="chess" className='w-1/5' />
          <span className='lg:text-5xl text-3xl font-[Comic_Sans] text-white'>TicnToe</span>
        </div>
        <span className='text-sm'>Waiting for Opponent(1/2)...</span>
      </div>
    );
  }

  return (
    <div className='h-screen bg-blue-100'>
      <div className='flex items-center justify-center h-full'>
        <ToastContainer />
        {gameContent}
        <div className='absolute bottom-0 text-sm p-1 font-[cursive] font-bold text-violet-400'>Made with 💜 by Soumya</div>
      </div>
    </div>
  );
}

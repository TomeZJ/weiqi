import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  // 游戏状态
  const [boardSize, setBoardSize] = useState(19) // 棋盘大小
  const [board, setBoard] = useState([]) // 棋盘状态
  const [currentPlayer, setCurrentPlayer] = useState('black') // 当前玩家
  const [history, setHistory] = useState([]) // 历史记录
  const [isGameOver, setIsGameOver] = useState(false) // 游戏是否结束
  const [blackCount, setBlackCount] = useState(0) // 黑棋数量
  const [whiteCount, setWhiteCount] = useState(0) // 白棋数量
  const [koPosition, setKoPosition] = useState(null) // 打劫位置
  const [gameResult, setGameResult] = useState(null) // 游戏结果
  const [robotMode, setRobotMode] = useState(false) // 机器人模式
  const [robotLevel, setRobotLevel] = useState('medium') // 机器人水平：easy, medium, hard
  
  const canvasRef = useRef(null) // Canvas引用
  const cellSize = useRef(30) // 单元格大小
  
  // 初始化棋盘
  useEffect(() => {
    initBoard()
  }, [boardSize])
  
  // 渲染棋盘
  useEffect(() => {
    drawBoard()
  }, [board, boardSize])
  
  // 初始化棋盘
  const initBoard = () => {
    const newBoard = Array(boardSize).fill().map(() => Array(boardSize).fill(null))
    setBoard(newBoard)
    setCurrentPlayer('black')
    setHistory([])
    setIsGameOver(false)
    setBlackCount(0)
    setWhiteCount(0)
    setKoPosition(null)
    setGameResult(null)
  }
  
  // 绘制棋盘
  const drawBoard = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const size = boardSize * cellSize.current + 60 // 棋盘大小（增加20px用于显示序号）
    canvas.width = size
    canvas.height = size
    
    // 绘制棋盘背景
    ctx.fillStyle = '#E6C089'
    ctx.fillRect(20, 20, (boardSize - 1) * cellSize.current, (boardSize - 1) * cellSize.current)
    
    // 绘制序号
    ctx.fillStyle = '#000'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // 生成横坐标字母（跳过I）
    const getColumnLabel = (index) => {
      const letter = String.fromCharCode(65 + index + (index >= 8 ? 1 : 0)) // 65是'A'的ASCII码，跳过'I'
      return letter
    }
    
    // 绘制横向序号（顶部，显示在横线交点处）
    for (let i = 0; i < boardSize; i++) {
      const x = 20 + i * cellSize.current
      const y = 10
      ctx.fillText(getColumnLabel(i), x, y)
    }
    
    // 绘制纵向序号（左侧，显示在竖线交点处）
    for (let i = 0; i < boardSize; i++) {
      const x = 10
      const y = 20 + i * cellSize.current
      ctx.fillText((boardSize - i).toString(), x, y)
    }
    
    // 绘制网格线
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1
    
    for (let i = 0; i < boardSize; i++) {
      const x = 20 + i * cellSize.current
      const y = 20 + i * cellSize.current
      
      // 横线
      ctx.beginPath()
      ctx.moveTo(20, y)
      ctx.lineTo(20 + (boardSize - 1) * cellSize.current, y)
      ctx.stroke()
      
      // 竖线
      ctx.beginPath()
      ctx.moveTo(x, 20)
      ctx.lineTo(x, 20 + (boardSize - 1) * cellSize.current)
      ctx.stroke()
    }
    
    // 绘制星位
    if (boardSize >= 9) {
      const starPositions = [3, 9, 15]
      starPositions.forEach(x => {
        starPositions.forEach(y => {
          if (x < boardSize && y < boardSize) {
            ctx.beginPath()
            ctx.arc(20 + x * cellSize.current, 20 + y * cellSize.current, 4, 0, 2 * Math.PI)
            ctx.fillStyle = '#000'
            ctx.fill()
          }
        })
      })
    }
    
    // 绘制棋子
    board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          drawStone(ctx, x, y, cell)
        }
      })
    })
    
    // 绘制打劫标记
    if (koPosition) {
      const [x, y] = koPosition
      const centerX = 20 + x * cellSize.current
      const centerY = 20 + y * cellSize.current
      ctx.beginPath()
      ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI)
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }
  
  // 绘制棋子
  const drawStone = (ctx, x, y, color) => {
    const centerX = 20 + x * cellSize.current
    const centerY = 20 + y * cellSize.current
    const radius = cellSize.current / 2 - 2
    
    // 绘制棋子阴影
    ctx.beginPath()
    ctx.arc(centerX + 2, centerY + 2, radius, 0, 2 * Math.PI)
    ctx.fillStyle = color === 'black' ? '#333' : '#ccc'
    ctx.fill()
    
    // 绘制棋子主体
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.fillStyle = color === 'black' ? '#000' : '#fff'
    ctx.fill()
    ctx.strokeStyle = color === 'black' ? '#333' : '#ccc'
    ctx.lineWidth = 1
    ctx.stroke()
  }
  
  // 计算气数
  const calculateLiberties = (x, y, color, currentBoard = board) => {
    const visited = new Set()
    const queue = [[x, y]]
    let liberties = 0
    
    while (queue.length > 0) {
      const [cx, cy] = queue.shift()
      const key = `${cx},${cy}`
      
      if (visited.has(key)) continue
      visited.add(key)
      
      // 检查四个方向
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]
      for (const [dx, dy] of directions) {
        const nx = cx + dx
        const ny = cy + dy
        
        if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
          if (currentBoard[ny][nx] === null) {
            liberties++
          } else if (currentBoard[ny][nx] === color && !visited.has(`${nx},${ny}`)) {
            queue.push([nx, ny])
          }
        }
      }
    }
    
    return liberties
  }
  
  // 检查是否可以落子
  const canPlaceStone = (x, y) => {
    // 检查位置是否已有棋子
    if (board[y][x] !== null) return false
    
    // 检查是否是打劫位置
    if (koPosition && koPosition[0] === x && koPosition[1] === y) return false
    
    // 模拟落子
    const newBoard = board.map(row => [...row])
    newBoard[y][x] = currentPlayer
    
    // 检查是否无气
    const liberties = calculateLiberties(x, y, currentPlayer, newBoard)
    if (liberties > 0) return true
    
    // 检查是否能提子
    const oppositeColor = currentPlayer === 'black' ? 'white' : 'black'
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]
    let capturedCount = 0
    let capturePosition = null
    
    for (const [dx, dy] of directions) {
      const nx = x + dx
      const ny = y + dy
      
      if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
        if (newBoard[ny][nx] === oppositeColor) {
          const oppLiberties = calculateLiberties(nx, ny, oppositeColor, newBoard)
          if (oppLiberties === 0) {
            // 计算提子数量
            const { captured } = removeCapturedStones(newBoard, oppositeColor)
            capturedCount += captured
            capturePosition = [nx, ny]
          }
        }
      }
    }
    
    // 如果只提了一个子，可能形成打劫
    if (capturedCount === 1 && capturePosition) {
      // 检查提子后是否形成打劫
      const { newBoard: boardAfterCapture } = removeCapturedStones(newBoard, oppositeColor)
      // 模拟对方回提
      const tempBoard = boardAfterCapture.map(row => [...row])
      const [cx, cy] = capturePosition
      tempBoard[cy][cx] = oppositeColor
      const tempLiberties = calculateLiberties(cx, cy, oppositeColor, tempBoard)
      if (tempLiberties === 0) {
        // 形成打劫，记录打劫位置
        setKoPosition([x, y])
      }
    } else {
      setKoPosition(null)
    }
    
    return capturedCount > 0
  }
  
  // 提子
  const removeCapturedStones = (board, color) => {
    const newBoard = board.map(row => [...row])
    let captured = 0
    
    for (let y = 0; y < boardSize; y++) {
      for (let x = 0; x < boardSize; x++) {
        if (newBoard[y][x] === color) {
          const liberties = calculateLiberties(x, y, color, newBoard)
          if (liberties === 0) {
            // 提子
            const visited = new Set()
            const queue = [[x, y]]
            
            while (queue.length > 0) {
              const [cx, cy] = queue.shift()
              const key = `${cx},${cy}`
              
              if (visited.has(key)) continue
              visited.add(key)
              
              newBoard[cy][cx] = null
              captured++
              
              const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]
              for (const [dx, dy] of directions) {
                const nx = cx + dx
                const ny = cy + dy
                
                if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
                  if (newBoard[ny][nx] === color && !visited.has(`${nx},${ny}`)) {
                    queue.push([nx, ny])
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return { newBoard, captured }
  }
  
  // 生成坐标标签
  const getCoordinateLabel = (x, y) => {
    const letter = String.fromCharCode(65 + x + (x >= 8 ? 1 : 0)) // 65是'A'的ASCII码，跳过'I'
    const number = boardSize - y
    return `${letter}${number}`
  }

  // 处理落子
  const handleClick = (e) => {
    if (isGameOver) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    // 处理机器人模拟点击
    let x, y
    if (e.currentTarget && e.currentTarget.getBoundingClientRect) {
      const rect = canvas.getBoundingClientRect()
      x = Math.round((e.clientX - rect.left - 20) / cellSize.current)
      y = Math.round((e.clientY - rect.top - 20) / cellSize.current)
    } else {
      // 直接使用传入的坐标（用于机器人落子）
      x = e.x
      y = e.y
    }
    
    if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
      if (canPlaceStone(x, y)) {
        // 生成坐标标签
        const coordinate = getCoordinateLabel(x, y)
        
        // 保存历史记录
        setHistory(prev => [...prev, { 
          board, 
          currentPlayer, 
          koPosition, 
          coordinate 
        }])
        
        // 落子
        let newBoard = board.map(row => [...row])
        newBoard[y][x] = currentPlayer
        
        // 提对方棋子
        const oppositeColor = currentPlayer === 'black' ? 'white' : 'black'
        const { newBoard: boardAfterCapture, captured } = removeCapturedStones(newBoard, oppositeColor)
        
        // 更新棋子数量
        if (currentPlayer === 'black') {
          setBlackCount(prev => prev + 1)
          setWhiteCount(prev => Math.max(0, prev - captured))
        } else {
          setWhiteCount(prev => prev + 1)
          setBlackCount(prev => Math.max(0, prev - captured))
        }
        
        // 检查己方是否有被提的棋子
        const { newBoard: finalBoard } = removeCapturedStones(boardAfterCapture, currentPlayer)
        
        setBoard(finalBoard)
        setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black')
      }
    }
  }
  
  // 悔棋
  const handleUndo = () => {
    if (history.length === 0) return
    
    const lastState = history[history.length - 1]
    setBoard(lastState.board)
    setCurrentPlayer(lastState.currentPlayer)
    setKoPosition(lastState.koPosition || null)
    setHistory(prev => prev.slice(0, -1))
    
    // 重新计算棋子数量
    let black = 0
    let white = 0
    lastState.board.forEach(row => {
      row.forEach(cell => {
        if (cell === 'black') black++
        if (cell === 'white') white++
      })
    })
    setBlackCount(black)
    setWhiteCount(white)
  }
  
  // 重新开始
  const handleRestart = () => {
    initBoard()
  }
  
  // 切换棋盘大小
  const handleBoardSizeChange = (size) => {
    setBoardSize(size)
  }
  
  // 终局判定
  const handleGameOver = () => {
    // 简单的数子算法
    let blackTerritory = 0
    let whiteTerritory = 0
    let blackStones = 0
    let whiteStones = 0
    
    // 计算棋子数量
    board.forEach(row => {
      row.forEach(cell => {
        if (cell === 'black') blackStones++
        if (cell === 'white') whiteStones++
      })
    })
    
    // 计算地盘
    const visited = new Set()
    for (let y = 0; y < boardSize; y++) {
      for (let x = 0; x < boardSize; x++) {
        const key = `${x},${y}`
        if (!visited.has(key) && board[y][x] === null) {
          // 检查空地的归属
          const { territory, owner } = analyzeTerritory(x, y)
          if (owner === 'black') {
            blackTerritory += territory
          } else if (owner === 'white') {
            whiteTerritory += territory
          }
          // 标记已访问
          territory.forEach(([tx, ty]) => {
            visited.add(`${tx},${ty}`)
          })
        }
      }
    }
    
    // 计算最终得分（黑棋贴7.5目）
    const blackScore = blackStones + blackTerritory
    const whiteScore = whiteStones + whiteTerritory + 7.5
    
    let result
    if (blackScore > whiteScore) {
      result = `黑棋胜 ${(blackScore - whiteScore).toFixed(1)} 目`
    } else {
      result = `白棋胜 ${(whiteScore - blackScore).toFixed(1)} 目`
    }
    
    setGameResult(result)
    setIsGameOver(true)
  }
  
  // 分析地盘
  const analyzeTerritory = (x, y) => {
    const visited = new Set()
    const queue = [[x, y]]
    const territory = []
    const owners = new Set()
    
    while (queue.length > 0) {
      const [cx, cy] = queue.shift()
      const key = `${cx},${cy}`
      
      if (visited.has(key)) continue
      visited.add(key)
      
      if (board[cy][cx] === null) {
        territory.push([cx, cy])
        // 检查四个方向
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]
        for (const [dx, dy] of directions) {
          const nx = cx + dx
          const ny = cy + dy
          
          if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
            const neighborKey = `${nx},${ny}`
            if (!visited.has(neighborKey)) {
              if (board[ny][nx] === null) {
                queue.push([nx, ny])
              } else {
                owners.add(board[ny][nx])
              }
            }
          }
        }
      }
    }
    
    // 确定地盘归属
    let owner = null
    if (owners.size === 1) {
      owner = Array.from(owners)[0]
    }
    
    return { territory, owner }
  }

  // 机器人AI落子
  const robotMove = () => {
    if (!robotMode || isGameOver) return
    
    // 模拟延迟，让机器人落子更自然
    setTimeout(() => {
      let bestMove = null
      let bestScore = -Infinity
      
      // 生成所有可能的落子位置
      const possibleMoves = []
      for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
          if (board[y][x] === null && canPlaceStone(x, y)) {
            possibleMoves.push([x, y])
          }
        }
      }
      
      if (possibleMoves.length === 0) return
      
      // 根据不同水平选择落子策略
      switch (robotLevel) {
        case 'easy':
          // 初级：随机选择
          bestMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
          break
        
        case 'medium':
          // 中级：简单评估
          possibleMoves.forEach(([x, y]) => {
            let score = 0
            
            // 检查是否是星位
            const starPositions = [3, 9, 15]
            if (starPositions.includes(x) && starPositions.includes(y)) {
              score += 10
            }
            
            // 检查是否是天元
            if (x === Math.floor(boardSize / 2) && y === Math.floor(boardSize / 2)) {
              score += 15
            }
            
            // 检查周围是否有己方棋子
            const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]
            let adjacentFriendly = 0
            for (const [dx, dy] of directions) {
              const nx = x + dx
              const ny = y + dy
              if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
                if (board[ny][nx] === currentPlayer) {
                  adjacentFriendly++
                }
              }
            }
            score += adjacentFriendly * 3
            
            if (score > bestScore) {
              bestScore = score
              bestMove = [x, y]
            }
          })
          break
        
        case 'hard':
          // 高级：更复杂的评估
          possibleMoves.forEach(([x, y]) => {
            let score = 0
            
            // 模拟落子
            const tempBoard = board.map(row => [...row])
            tempBoard[y][x] = currentPlayer
            
            // 计算气数
            const liberties = calculateLiberties(x, y, currentPlayer, tempBoard)
            score += liberties * 2
            
            // 检查是否能提子
            const oppositeColor = currentPlayer === 'black' ? 'white' : 'black'
            const { captured } = removeCapturedStones(tempBoard, oppositeColor)
            score += captured * 10
            
            // 检查是否是星位或天元
            const starPositions = [3, 9, 15]
            if (starPositions.includes(x) && starPositions.includes(y)) {
              score += 8
            }
            if (x === Math.floor(boardSize / 2) && y === Math.floor(boardSize / 2)) {
              score += 12
            }
            
            // 检查周围棋子
            const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]
            let adjacentFriendly = 0
            let adjacentOpponent = 0
            for (const [dx, dy] of directions) {
              const nx = x + dx
              const ny = y + dy
              if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
                if (board[ny][nx] === currentPlayer) {
                  adjacentFriendly++
                } else if (board[ny][nx] === oppositeColor) {
                  adjacentOpponent++
                }
              }
            }
            score += adjacentFriendly * 3
            score += adjacentOpponent * 2
            
            if (score > bestScore) {
              bestScore = score
              bestMove = [x, y]
            }
          })
          break
      }
      
      // 执行落子
      if (bestMove) {
        const [x, y] = bestMove
        handleClick({ x, y }) // 直接传递坐标
      }
    }, 500) // 500ms延迟
  }

  // 监听当前玩家变化，机器人自动落子
  useEffect(() => {
    if (robotMode && currentPlayer === 'white') {
      robotMove()
    }
  }, [currentPlayer, robotMode, robotLevel, board, koPosition])

  return (
    <div className="app">
      <h1>围棋游戏</h1>
      
      <div className="controls">
        <div className="player-info">
          <div className={`player ${currentPlayer === 'black' ? 'active' : ''}`}>
            <span className="stone black"></span>
            <span>黑棋: {blackCount}</span>
          </div>
          <div className={`player ${currentPlayer === 'white' ? 'active' : ''}`}>
            <span className="stone white"></span>
            <span>白棋: {whiteCount}</span>
          </div>
        </div>
        
        <div className="robot-controls">
          <label className="robot-mode-toggle">
            <input 
              type="checkbox" 
              checked={robotMode} 
              onChange={(e) => setRobotMode(e.target.checked)}
            />
            机器人模式
          </label>
          {robotMode && (
            <div className="robot-level-selector">
              <span>水平:</span>
              <button 
                className={robotLevel === 'easy' ? 'active' : ''}
                onClick={() => setRobotLevel('easy')}
              >
                初级
              </button>
              <button 
                className={robotLevel === 'medium' ? 'active' : ''}
                onClick={() => setRobotLevel('medium')}
              >
                中级
              </button>
              <button 
                className={robotLevel === 'hard' ? 'active' : ''}
                onClick={() => setRobotLevel('hard')}
              >
                高级
              </button>
            </div>
          )}
        </div>
        
        <div className="buttons">
          <button onClick={() => handleBoardSizeChange(9)}>9×9</button>
          <button onClick={() => handleBoardSizeChange(13)}>13×13</button>
          <button onClick={() => handleBoardSizeChange(19)}>19×19</button>
          <button onClick={handleUndo}>悔棋</button>
          <button onClick={handleRestart}>重新开始</button>
          <button onClick={handleGameOver}>结束游戏</button>
        </div>
      </div>
      
      <div className="game-container">
        <div className="board-container">
          <canvas 
            ref={canvasRef} 
            onClick={handleClick}
            className="board"
          />
        </div>
        
        <div className="history-container">
          <h3>历史记录</h3>
          <div className="history-list">
            {history.slice().reverse().map((move, index) => (
              <div key={history.length - index - 1} className="move-item">
                <span className="move-number">{history.length - index}.</span>
                <span className={`move-stone ${move.currentPlayer}`}></span>
                <span className="move-coordinate">{move.coordinate}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {isGameOver && (
        <div className="game-over">
          <h2>游戏结束</h2>
          <p>{gameResult}</p>
          <button onClick={handleRestart}>重新开始</button>
        </div>
      )}
    </div>
  )
}

export default App

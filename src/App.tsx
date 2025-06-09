import { useState, useEffect } from 'react'
import { ITimezone } from 'react-timezone-select'
import { toHiragana, toKatakana } from '@koozaki/romaji-conv'
import { Grid } from './components/grid/Grid'
import { AppArea } from './components/keyboard/Area'
import { DatePickerModal } from './components/modals/DatePickerModal'
import { InfoModal } from './components/modals/InfoModal'
import { SupportModal } from './components/modals/SupportModal'
import { StatsModal } from './components/modals/StatsModal'
import { MigrateStatsModal } from './components/modals/MigrateStatsModal'
import { SettingsModal } from './components/modals/SettingsModal'
import { t, WIN_MESSAGES } from './constants/strings'
import { Adsense } from '@ctrl/react-adsense'
import {
  MAX_WORD_LENGTH,
  MAX_CHALLENGES,
  REVEAL_TIME_MS,
  GAME_LOST_INFO_DELAY,
  WELCOME_INFO_MODAL_MS,
  PREFERRED_DISPLAY_LANGUAGE,
  AD_CLIENT_ID,
  AD_SLOT_TOP_BANNER_ID,
  AD_SLOT_BOTTOM_BANNER_ID,
  AD_SLOT_LEFT_SKIN_ID,
  AD_SLOT_RIGHT_SKIN_ID,
} from './constants/settings'
import {
  isWordInWordList,
  isWinningWord,
  solution,
  isKatakana,
  findFirstUnusedReveal,
  getDateByIndex,
  getIndexByDate,
  getIsLatestGame,
  setGameDate,
  unicodeLength,
  setWordOfDay,
} from './lib/words'
import { addStatsForCompletedGame, loadStats } from './lib/stats'
import {
  saveShareStatusToLocalStorage,
  removeShareStatusFromLocalStorage,
  loadGameStateFromLocalStorage,
  saveGameStateToLocalStorage,
  setStoredIsHighContrastMode,
  getStoredIsHighContrastMode,
  setStoredIsHintMode,
  getStoredIsHintMode,
  setStoredDisplayLanguage,
  getStoredDisplayLanguage,
  setStoredTimezone,
  getStoredTimezone,
  setStoredAppArea,
  getStoredAppArea,
  setStoredGameIndex,
  removeStoredGameIndex,
  getStoredGameIndex,
} from './lib/localStorage'
import { getToday } from './lib/dateutils'
import { default as GraphemeSplitter } from 'grapheme-splitter'

import './App.css'
import { PastGameContainer } from './components/alerts/PastGameContainer'
import { AlertContainer } from './components/alerts/AlertContainer'
import { useAlert } from './context/AlertContext'
import { Navbar } from './components/navbar/Navbar'

function App() {
  const isLatestGame = getIsLatestGame()

  const prefersDarkMode = window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches

  const {
    /* showCorrectWord: showCorrectWordAlert, */
    showError: showErrorAlert,
    showSuccess: showSuccessAlert,
  } = useAlert()
  const [currentGuess, setCurrentGuess] = useState('')
  const [currentInputText, setCurrentInputText] = useState('')
  const [isGameWon, setIsGameWon] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
  const [isDatePickerModalOpen, setIsDatePickerModalOpen] = useState(false)
  const [isMigrateStatsModalOpen, setIsMigrateStatsModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [currentRowClass, setCurrentRowClass] = useState('')
  const [isGameLost, setIsGameLost] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme')
      ? localStorage.getItem('theme') === 'dark'
      : prefersDarkMode
      ? true
      : false
  )
  const [isHighContrastMode, setIsHighContrastMode] = useState(
    getStoredIsHighContrastMode()
  )
  const [displayLanguage, setDisplayLanguage] = useState(
    getStoredDisplayLanguage()
  )
  const [isRevealing, setIsRevealing] = useState(false)
  const [guesses, setGuesses] = useState<string[]>(() => {
    const loaded = loadGameStateFromLocalStorage(isLatestGame)
    if (loaded?.solution !== solution) {
      removeShareStatusFromLocalStorage()
      return []
    }
    const gameWasWon = loaded.guesses.includes(solution)
    if (gameWasWon) {
      setIsGameWon(true)
    }
    if (loaded.guesses.length === MAX_CHALLENGES && !gameWasWon) {
      setIsGameLost(true)
      /*
      showCorrectWordAlert(
        t('CORRECT_WORD_MESSAGE', solutionIndex.toString(), solution),
        {
          persist: true,
        }
      )
      */
    }
    return loaded.guesses
  })

  const [stats, setStats] = useState(() => loadStats())

  const [timezone, setTimezone] = useState(getStoredTimezone())

  const [isHintMode, setIsHintMode] = useState(getStoredIsHintMode())

  const [isHardMode, setIsHardMode] = useState(
    localStorage.getItem('gameMode')
      ? localStorage.getItem('gameMode') === 'hard'
      : false
  )

  const [activeAppArea, setActiveAppArea] = useState(getStoredAppArea())

  useEffect(() => {
    // if no game state on load,
    // show the user the how-to info modal
    //if (!loadGameStateFromLocalStorage()) {
    if (isLatestGame && !(isGameWon || isGameLost)) {
      setTimeout(() => {
        setIsInfoModalOpen(true)
      }, WELCOME_INFO_MODAL_MS)
    }
    //}
  }, [isLatestGame, isGameWon, isGameLost])

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    if (isHighContrastMode) {
      document.documentElement.classList.add('high-contrast')
    } else {
      document.documentElement.classList.remove('high-contrast')
    }
  }, [isDarkMode, isHighContrastMode])

  const handleTimezone = (timezone: ITimezone) => {
    if (isLatestGame && guesses.length === 0) {
      timezone = typeof timezone === 'string' ? timezone : timezone.value
      setTimezone(timezone)
      setStoredTimezone(timezone)
      setStoredGameIndex(getIndexByDate(getToday()).toString())
      setWordOfDay()
      saveGameStateToLocalStorage(getIsLatestGame(), { guesses, solution })
    } else {
      showErrorAlert(t('TIMEZONE_ALERT_MESSAGE'))
    }
  }

  const handleDarkMode = (isDark: boolean) => {
    setIsDarkMode(isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }

  const handleHintMode = (isHint: boolean) => {
    if (
      guesses.length === 0 ||
      isGameWon ||
      isGameLost ||
      !getStoredIsHintMode()
    ) {
      setIsHintMode(isHint)
      setStoredIsHintMode(isHint)
    } else {
      showErrorAlert(t('HINT_MODE_ALERT_MESSAGE'))
    }
  }

  const handleHardMode = (isHard: boolean) => {
    if (
      guesses.length === 0 ||
      isGameWon ||
      isGameLost ||
      localStorage.getItem('gameMode') === 'hard'
    ) {
      setIsHardMode(isHard)
      localStorage.setItem('gameMode', isHard ? 'hard' : 'normal')
    } else {
      showErrorAlert(t('HARD_MODE_ALERT_MESSAGE'))
    }
  }

  const handleHighContrastMode = (isHighContrast: boolean) => {
    setIsHighContrastMode(isHighContrast)
    setStoredIsHighContrastMode(isHighContrast)
  }

  const handleDisplayLanguage = (displayLanguage: string) => {
    setDisplayLanguage(displayLanguage)
    setStoredDisplayLanguage(displayLanguage)
  }

  const handleAppArea = (appArea: string) => {
    setActiveAppArea(appArea)
    setStoredAppArea(appArea)
  }

  const clearCurrentRowClass = () => {
    setCurrentRowClass('')
  }

  useEffect(() => {
    saveGameStateToLocalStorage(getIsLatestGame(), { guesses, solution })
  }, [guesses])

  useEffect(() => {
    if (isGameWon) {
      const winMessage =
        displayLanguage === PREFERRED_DISPLAY_LANGUAGE
          ? WIN_MESSAGES.ja[guesses.length - 1]
          : WIN_MESSAGES.en[guesses.length - 1]
      const delayMs = REVEAL_TIME_MS * MAX_WORD_LENGTH

      showSuccessAlert(winMessage, {
        delayMs,
        onClose: () => setIsStatsModalOpen(true),
      })
    }

    if (isGameLost) {
      setTimeout(() => {
        setIsStatsModalOpen(true)
      }, GAME_LOST_INFO_DELAY)
    }
  }, [isGameWon, isGameLost, guesses, displayLanguage, showSuccessAlert])

  const onChar = (value: string) => {
    if (
      unicodeLength(`${currentGuess}${value}`) <= MAX_WORD_LENGTH &&
      guesses.length < MAX_CHALLENGES &&
      !isGameWon
    ) {
      setCurrentGuess(`${currentGuess}${value}`)
      setCurrentInputText(`${currentInputText}${value}`)
    }
  }

  const onDelete = () => {
    if (currentGuess === currentInputText) {
      setCurrentGuess(
        new GraphemeSplitter()
          .splitGraphemes(currentGuess)
          .slice(0, -1)
          .join('')
      )
    }
    setCurrentInputText(
      new GraphemeSplitter()
        .splitGraphemes(currentInputText)
        .slice(0, -1)
        .join('')
    )
  }

  const onEnter = () => {
    // convert romaji or katakana input to hiragana
    let currentInputTextInHiragana = isKatakana
      ? toKatakana(currentInputText)
      : toHiragana(currentInputText)
    let currentGuessInHiragana = new GraphemeSplitter()
      .splitGraphemes(currentInputTextInHiragana)
      .slice(0, MAX_WORD_LENGTH)
      .join('')

    setCurrentGuess(currentGuessInHiragana)
    setCurrentInputText(currentInputTextInHiragana)

    if (isGameWon || isGameLost) {
      return
    }

    if (currentInputTextInHiragana === '' || currentGuessInHiragana === '') {
      return
    }

    if (!(unicodeLength(currentInputTextInHiragana) === MAX_WORD_LENGTH)) {
      return showErrorAlert(
        t('NOT_ENOUGH_LETTERS_MESSAGE', currentInputTextInHiragana)
      )
    }

    if (!(unicodeLength(currentGuessInHiragana) === MAX_WORD_LENGTH)) {
      setCurrentRowClass('jiggle')
      return showErrorAlert(
        t('NOT_ENOUGH_LETTERS_MESSAGE', currentGuessInHiragana),
        {
          onClose: clearCurrentRowClass,
        }
      )
    }

    if (!isWordInWordList(currentGuessInHiragana)) {
      setCurrentRowClass('jiggle')
      return showErrorAlert(t('WORD_NOT_FOUND_MESSAGE'), {
        onClose: clearCurrentRowClass,
      })
    }

    // enforce hard mode - all guesses must contain all previously revealed letters
    if (isHardMode) {
      const firstMissingReveal = findFirstUnusedReveal(
        currentGuessInHiragana,
        guesses
      )
      if (firstMissingReveal) {
        setCurrentRowClass('jiggle')
        return showErrorAlert(firstMissingReveal, {
          onClose: clearCurrentRowClass,
        })
      }
    }

    setIsRevealing(true)
    // turn this back off after all
    // chars have been revealed
    setTimeout(() => {
      setIsRevealing(false)
    }, REVEAL_TIME_MS * MAX_WORD_LENGTH)

    const winningWord = isWinningWord(currentGuessInHiragana)

    if (
      unicodeLength(currentGuessInHiragana) === MAX_WORD_LENGTH &&
      guesses.length < MAX_CHALLENGES &&
      !isGameWon
    ) {
      setGuesses([...guesses, currentGuessInHiragana])
      setCurrentGuess('')
      setCurrentInputText('')
      saveShareStatusToLocalStorage(isHintMode, isHardMode)

      if (winningWord) {
        if (isLatestGame) {
          setStats(addStatsForCompletedGame(stats, guesses.length))
        }
        return setIsGameWon(true)
      }

      if (guesses.length === MAX_CHALLENGES - 1) {
        if (isLatestGame) {
          setStats(addStatsForCompletedGame(stats, guesses.length + 1))
        }
        setIsGameLost(true)
        /*
        showCorrectWordAlert(
          t('CORRECT_WORD_MESSAGE', solutionIndex.toString(), solution),
          {
            persist: true,
            delayMs: REVEAL_TIME_MS * MAX_WORD_LENGTH + 1,
          }
        )
        */
      }
    }
  }

  return (
    <div className="m-0 p-0 max-w-full">
      <div className="text-center adsbygoogle">
        <Adsense client={AD_CLIENT_ID} slot={AD_SLOT_TOP_BANNER_ID} />
      </div>
      <div className="pt-2 pb-3 flex max-w-full">
        <div className="hidden md:block flex-none w-32 lg:w-64 mt-3">
          <div className="text-center adsbygoogle">
            <Adsense client={AD_CLIENT_ID} slot={AD_SLOT_LEFT_SKIN_ID} />
          </div>
        </div>
        <div className="block flex-grow max-w-full mx-auto sm:px-6 lg:px-8">
          <Navbar
            setIsInfoModalOpen={setIsInfoModalOpen}
            setIsSupportModalOpen={setIsSupportModalOpen}
            setIsDatePickerModalOpen={setIsDatePickerModalOpen}
            setIsStatsModalOpen={setIsStatsModalOpen}
            setIsSettingsModalOpen={setIsSettingsModalOpen}
          />
          <PastGameContainer
            isLatestGame={isLatestGame}
            setIsDatePickerModalOpen={setIsDatePickerModalOpen}
          />
          <Grid
            guesses={guesses}
            currentGuess={currentGuess}
            isRevealing={isRevealing}
            currentRowClassName={currentRowClass}
          />
          <AppArea
            onChar={onChar}
            onDelete={onDelete}
            onEnter={onEnter}
            setCurrentGuess={setCurrentGuess}
            setCurrentInputText={setCurrentInputText}
            currentInputText={currentInputText}
            setActiveAppArea={setActiveAppArea}
            activeAppArea={activeAppArea}
            guesses={guesses}
            isRevealing={isRevealing}
          />
          <InfoModal
            isOpen={isInfoModalOpen}
            handleClose={() => setIsInfoModalOpen(false)}
          />
          <SupportModal
            isOpen={isSupportModalOpen}
            handleClose={() => setIsSupportModalOpen(false)}
          />
          <StatsModal
            isOpen={isStatsModalOpen}
            handleClose={() => {
              setIsStatsModalOpen(false)
              if (!isLatestGame && (isGameWon || isGameLost)) {
                removeStoredGameIndex()
                window.location.href = '/kotobade-asobou'
              }
            }}
            guesses={guesses}
            gameStats={stats}
            isLatestGame={isLatestGame}
            isGameLost={isGameLost}
            isGameWon={isGameWon}
            handleCalendarIcon={() => {
              setIsStatsModalOpen(false)
              setIsDatePickerModalOpen(true)
            }}
            handleShareToClipboard={() =>
              showSuccessAlert(t('GAME_COPIED_MESSAGE'))
            }
            handleMigrateStatsButton={() => {
              setIsStatsModalOpen(false)
              setIsMigrateStatsModalOpen(true)
            }}
            isHintMode={isHintMode}
            isHardMode={isHardMode}
            isDarkMode={isDarkMode}
            isHighContrastMode={isHighContrastMode}
            numberOfGuessesMade={guesses.length}
          />
          <DatePickerModal
            isOpen={isDatePickerModalOpen}
            initialDate={getDateByIndex(getStoredGameIndex())}
            handleSelectDate={(date) => {
              setIsDatePickerModalOpen(false)
              setGameDate(date)
            }}
            handleClose={() => setIsDatePickerModalOpen(false)}
          />
          <MigrateStatsModal
            isOpen={isMigrateStatsModalOpen}
            handleClose={() => setIsMigrateStatsModalOpen(false)}
          />
          <SettingsModal
            isOpen={isSettingsModalOpen}
            handleClose={() => setIsSettingsModalOpen(false)}
            timezone={timezone}
            handleTimezone={handleTimezone}
            isHintMode={isHintMode}
            handleHintMode={handleHintMode}
            isHardMode={isHardMode}
            handleHardMode={handleHardMode}
            isDarkMode={isDarkMode}
            handleDarkMode={handleDarkMode}
            isHighContrastMode={isHighContrastMode}
            handleHighContrastMode={handleHighContrastMode}
            displayLanguage={displayLanguage!}
            handleDisplayLanguage={handleDisplayLanguage}
            activeAppArea={activeAppArea!}
            handleAppArea={handleAppArea}
          />
          <AlertContainer />
        </div>
        <div className="hidden md:block flex-none w-32 lg:w-64 mt-3">
          <div className="text-center adsbygoogle">
            <Adsense client={AD_CLIENT_ID} slot={AD_SLOT_RIGHT_SKIN_ID} />
          </div>
        </div>

        
      <div className="text-center adsbygoogle">
        <Adsense client={AD_CLIENT_ID} slot={AD_SLOT_BOTTOM_BANNER_ID} />
      </div>
    </div>
    {/* 新しく追加したセクション */}
        <div className="mt-8 px-4 py-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">ことのはたんご - 日本語版Wordleで言葉の世界を冒険しよう！</h2>
          <script async="async" data-cfasync="false" src="//pl26874830.profitableratecpm.com/af2c486bd69c3e4a04e27ef06d360157/invoke.js"></script>
<div id="container-af2c486bd69c3e4a04e27ef06d360157"></div>
          <p className="mb-6 text-lg text-gray-600 dark:text-gray-300">
            こんにちは、言葉の冒険者の皆さん！「ことのはたんご」へようこそ。ここでは、毎日新しい言葉の謎に挑戦できる日本語版Wordleゲームをお楽しみいただけます。「ことのはたんご」は、あなたの語彙力と直感を磨く楽しい方法です。
          </p>

          <h3 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">「ことのはたんご」とは？</h3>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            「ことのはたんご」は、日本語の豊かさと奥深さを楽しみながら学べる、ユニークな単語パズルゲームです。毎日更新される4文字の単語を、12回以内に当てることが目標です。日本語学習者から言葉遊びを愛する方まで、幅広い層に人気です。
          </p>

          <h3 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">「ことのはたんご」の遊び方</h3>
          <ol className="list-decimal list-inside mb-6 text-gray-600 dark:text-gray-300">
            <li>4文字のひらがな単語を入力します。</li>
            <li>入力後、各文字の正方形の色が変わり、ヒントを示します。
              <ul className="list-disc list-inside ml-6 mt-2">
                <li>緑：正しい文字が正しい位置にあります。</li>
                <li>黄：文字は単語に含まれていますが、位置が違います。</li>
                <li>グレー：その文字は単語に含まれていません。</li>
              </ul>
            </li>
            <li>これらのヒントを基に、正解の単語を推測していきます。</li>
            <li>12回以内に正解できるよう挑戦しましょう！</li>
          </ol>

          <h3 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">「ことのはたんご」の特徴</h3>
          <ul className="list-disc list-inside mb-6 text-gray-600 dark:text-gray-300">
            <li>日替わり単語: 毎日新しい単語が登場し、常に新鮮な挑戦が楽しめます。</li>
            <li>ヒントモード: 初心者の方も安心。オプションのヒントモードで、より詳細なヒントが得られます。</li>
            <li>過去問題へのアクセス: 以前の「ことのはたんご」にもチャレンジできます。</li>
            <li>SNS共有機能: Twitter、Threads、LINE、さらにはBlueSkyにも直接結果を投稿できます。</li>
            <li>統計情報の転送: 新しいデバイスでも、これまでの成績を引き継げます。</li>
            <li>自動カタカナモード: カタカナ語の日は自動的にカタカナモードに切り替わります。</li>
          </ul>

          <h3 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">ユーザーの声</h3>
          <div className="mb-6 text-gray-600 dark:text-gray-300">
            <p className="mb-2">「毎日の『ことのはたんご』が楽しみです。語彙力が確実に上がっているのを感じます！」 - Aさん（28歳）</p>
            <p className="mb-2">「『ことのはたんご』のおかげで、日本語の勉強が楽しくなりました。外国人の私でも楽しめます。」 - Bさん（アメリカ出身）</p>
            <p>「子供と一緒に『ことのはたんご』を解くのが日課になりました。家族の絆も深まる素晴らしいゲームです。」 - Cさん（42歳）</p>
          </div>

          <h3 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">なぜ「ことのはたんご」が人気なのか？</h3>
          <ul className="list-disc list-inside mb-6 text-gray-600 dark:text-gray-300">
            <li>学習と娯楽の融合: 楽しみながら日本語力を向上させられる理想的なツールです。</li>
            <li>毎日の挑戦: 日替わりの単語で、継続的な学習意欲を維持できます。</li>
            <li>幅広い単語: 名詞、動詞、形容詞など、様々な品詞の単語が出題されます。</li>
            <li>コミュニティ感: 結果をSNSで共有することで、友人や他のプレイヤーと一緒に楽しめます。</li>
            <li>アクセシビリティ: スマートフォンやPCから簡単にアクセスでき、いつでもどこでも遊べます。</li>
          </ul>

          <h3 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">「ことのはたんご」で語彙力アップ！</h3>
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            「ことのはたんご」は単なるゲームではありません。日本語の美しさと複雑さを探求する旅です。毎日新しい単語に出会い、その意味や用法を学ぶことで、あなたの日本語力は確実に向上していきます。
          </p>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            「ことのはたんご」を通じて、次のような効果が期待できます：
            <ul className="list-disc list-inside mt-2 ml-4">
              <li>語彙力の増強</li>
              <li>漢字の読み方の習得</li>
              <li>日本語の文法感覚の向上</li>
              <li>思考力と推理力の強化</li>
            </ul>
          </p>

          <h3 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">「ことのはたんご」の楽しみ方</h3>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            「ことのはたんご」を楽しむためには、毎日の挑戦を欠かさず行うことが重要です。このゲームは、あなたの日本語力を向上させるだけでなく、言葉の使い方を深く理解する手助けをします。友達と一緒に「ことのはたんご」をプレイすることで、競争心を高め、より楽しい体験を得ることができます。
          </p>
          <h3 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">「ことのはたんご」での学び</h3>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            「ことのはたんご」は、単なるゲームではなく、日本語を学ぶための素晴らしいツールです。毎日新しい単語に挑戦することで、あなたの語彙力は確実に向上します。さらに、「ことのはたんご」を通じて、言葉の面白さを再発見することができるでしょう。
          </p>
          <h3 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">「ことのはたんご」の魅力を共有しよう</h3>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            友達や家族と「ことのはたんご」の魅力を共有することで、より多くの人に日本語の楽しさを伝えることができます。SNSでの結果共有を通じて、あなたの成績を自慢したり、他のプレイヤーと交流したりすることも楽しみの一つです。
          </p>
          <h3 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">「ことのはたんご」のコミュニティ</h3>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            「ことのはたんご」には、熱心なコミュニティがあります。プレイヤー同士で結果を共有し、互いにアドバイスをし合うことで、より良い学びの環境が生まれます。このコミュニティに参加することで、あなたも日本語学習の楽しさを実感できるでしょう。さあ、今すぐ「ことのはたんご」で日本語の冒険を始めましょう！
          </p>
          <h3 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">日本語 Wordle の新しい形</h3>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            「ことのはたんご」は、日本語 Wordle の新しい形として、多くのプレイヤーに愛されています。毎日の新しい単語を通じて、楽しみながら日本語を学ぶことができるこのゲームは、語彙力を向上させるだけでなく、思考力や推理力も鍛えることができます。さあ、あなたも「ことのはたんご」で日本語の冒険に出かけましょう！
          </p>

          <h3 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">「ことのはたんご」で日本語を楽しもう！</h3>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            「ことのはたんご」は、毎日新しい日本語の単語を学ぶ素晴らしい機会です。このゲームを通じて、あなたは日本語の語彙を増やし、言葉の使い方を理解することができます。特に、言葉を遊びながら学ぶことで、記憶に残りやすくなり、楽しく学習することができます。
          </p>
          <h3 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">日本語 Wordle の楽しさ</h3>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            「ことのはたんご」は、日本語 Wordle の要素を取り入れたゲームであり、プレイヤーは毎日新しい単語に挑戦します。正しい文字を見つけることで、単語の意味を理解し、語彙力を向上させることができます。このように、楽しみながら日本語を学ぶことができるのが「ことのはたんご」の魅力です。
          </p>
          <h3 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">言葉で遊ぶ楽しさ</h3>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            「ことのはたんご」をプレイすることで、言葉で遊ぶ楽しさを体験できます。毎日の挑戦を通じて、あなたの日本語力は確実に向上します。また、友達や家族と一緒にプレイすることで、コミュニケーションを深めることもできます。日本語を学ぶことは、ただの勉強ではなく、楽しみながら成長することができるのです。
          </p>
        </div>
        
      </div>
      
  )
}

export default App

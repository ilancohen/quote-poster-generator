const SAMPLE_QUOTES = {
  quotes: [
    {
      text: "All the world's a stage, and all the men and women merely players; they have their exits and their entrances, and one man in his time plays many parts.",
      author: "Shakespeare, As You Like It",
    },
    {
      text: "Polonius: What do you read, my lord?\nHamlet: Words, words, words.",
      author: "Shakespeare, Hamlet",
    },
    {
      text: "There is nothing either good or bad, but thinking makes it so.",
      author: "Shakespeare",
    },
    {
      text: "We are such stuff as dreams are made on, and our little life is rounded with a sleep.",
      author: "Shakespeare, The Tempest",
    },
    {
      text: '"Begin at the beginning," the King said gravely, "and go on till you come to the end: then stop."',
      author: "Lewis Carroll",
    },
    {
      text: '"There\'s no use trying," she said; "one can\'t believe impossible things." "I daresay you haven\'t had much practice," said the Queen. "When I was your age, I always did it for half-an-hour a day. Why, sometimes I\'ve believed as many as six impossible things before breakfast."',
      author: "Lewis Carroll",
    },
    {
      text: "Be ashamed to die until you have won some victory for humanity.",
      author: "Horace Mann",
    },
    {
      text: "Write it on your heart that every day is the best day in the year. He only is rich who owns the day, and no one owns the day who allows it to be invaded with worry, fret, and anxiety.",
      author: "Ralph Waldo Emerson",
    },
    {
      text: "Finish every day and be done with it. You have done what you could; some blunders and absurdities have crept in; forget them as soon as you can. Tomorrow is a new day; you shall begin it well and serenely and with too high a spirit to be cumbered by your old nonsense.",
      author: "Ralph Waldo Emerson",
    },
    {
      text: "Nothing great was ever achieved without enthusiasm.",
      author: "Ralph Waldo Emerson",
    },
    {
      text: "To be great is to be misunderstood.",
      author: "Ralph Waldo Emerson",
    },
    {
      text: "It is not enough to be industrious; so are the ants. What are you industrious about?",
      author: "Henry David Thoreau",
    },
    {
      text: "The mass of men lead lives of quiet desperation.",
      author: "Henry David Thoreau",
    },
    {
      text: "To live is the rarest thing in the world. Most people exist, that is all.",
      author: "Oscar Wilde",
    },
    {
      text: "All babies are born with a knowledge of poetry, because the lub-dub of the mother’s heart is in iambic meter. Then life slowly starts to choke the poetry out of us.",
      author: "Billy Collins",
    },
    {
      text: "Laughter and tears are both responses to frustration and exhaustion. I myself prefer to laugh, since there is less cleaning up to do afterward.",
      author: "Kurt Vonnegut",
    },
    {
      text: "A great swindle of our time is the assumption that science has made religion obsolete. All science has damaged is the story of Adam and Eve and the story of Jonah and the Whale. Everything else holds up pretty well, particularly lessons about fairness and gentleness. People who find those lessons irrelevant in the twentieth century are simply using science as an excuse for greed and harshness. Science has nothing to do with it, friends.",
      author: "Kurt Vonnegut",
    },
    {
      text: "Shall we make a new rule of life from tonight: always to try to be a little kinder than is necessary?",
      author: "J.M. Barrie",
    },
    {
      text: "Everybody has a secret world inside of them. All of the people of the world, I mean everybody. No matter how dull and boring they are on the outside, inside them they've all got unimaginable, magnificent, wonderful, stupid, amazing worlds. Not just one world. Hundreds of them. Thousands maybe.",
      author: "Neil Gaiman",
    },
    {
      text: "What is this life if, full of care,\nWe have no time to stand and stare.",
      author: 'from "Leisure," by W.H. Davies',
    },
    {
      text: "The key to immortality is first living a life worth remembering.",
      author: "Brandon Lee",
    },
    {
      text: "Never throughout history has a man who lived a life of ease left a name worth remembering.",
      author: "Theodore Roosevelt",
    },
    {
      text: "Our deepest fear is not that we are inadequate. Our deepest fear is that we are powerful beyond measure. It is our light, not our darkness that most frightens us. We ask ourselves, Who am I to be brilliant, gorgeous, talented, fabulous? Actually, who are you not to be? You are a child of God. Your playing small does not serve the world. There is nothing enlightened about shrinking so that other people won't feel insecure around you. We are all meant to shine, as children do. We were born to make manifest the glory of God that is within us. It's not just in some of us; it's in everyone. And as we let our own light shine, we unconsciously give other people permission to do the same. As we are liberated from our own fear, our presence automatically liberates others.",
      author: "Marianne Williamson",
    },
    {
      text: "Living is not a private affair of the individual. Living is what we do with God's time, what we do with God's world.",
      author: "A.J. Heschel",
    },
    {
      text: "There are people who put their dreams in a little box and say, Yes, I've got dreams, of course I've got dreams. Then they put the box away and bring it out once in awhile to look in it, and yep, they're still there.",
      author: "Erma Bombeck",
    },
    {
      text: "One of the illusions of life is that the present hour is not the critical, decisive hour. Write it on your heart that every day is the best day of the year. He only is rich who owns the day, and no one owns the day who allows it to be invaded with worry, fret, and anxiety. Finish every day and be done with it. you have done what you could. some blunders and absurdities have crept in; forget them as soon as you can. Tomorrow is a new day. you shall begin it serenely and with too high a spirit to be encumbered with your old nonsense.",
      author: "Ralph Waldo Emerson",
    },
    {
      text: 'Make no little plans. They have no magic to stir men’s blood and probably themselves will not be realized. Make big plans; aim high in hope and work, remembering that a noble, logical diagram once recorded will never die, but long after we are gone will be a living thing, asserting itself with ever-growing insistence. Remember that our sons and grandsons are going to do things that would stagger us. Let your watchword be order and your beacon beauty."',
      author: "Daniel  Burnham",
    },
    {
      text: '"I could tell you my adventures -- beginning from this morning," said Alice a little timidly: "but it\'s no use going back to yesterday, because I was a different person then."',
      author: "Lewis Carroll, Alice's Adventures in Wonderland",
    },
    {
      text: "I believe the nicest and sweetest days are not those on which anything very splendid or wonderful or exciting happens but just those that bring simple little pleasures, following one another softly, like pearls slipping off a string.",
      author: "L.M. Montgomery",
    },
    {
      text: "When you live in the shadow of insanity, the appearance of another mind that thinks and talks as yours does is something close to a blessed event. Like Robinson Crusoe's discovery of footprints on the sand.",
      author: "Robert M. Pirsig,  Zen and the Art of Motorcycle Maintenance",
    },
    {
      text: '"I beg you to have patience with everything unresolved in  your  heart,   and  to try to love the questions themselves as if they were locked rooms or  books written in a very foreign language. Don\'t search for the answers, which could not be given to you now, because  you  would not  be able to live them.  And the point is to live everything. Live the questions now. Perhaps then, someday far in the future, you will gradually, without even noticing  it,  live your way into the answer."',
      author: "Rainer Maria Rilke",
    },
    {
      text: '"To know someone with whom you can feel there is understanding in spite of distances or thoughts unexpressed... that can make this life a garden."',
      author: "Goethe",
    },
    {
      text: "No people has ever insisted more firmly than the Jews that history has a purpose and humanity a destiny. At a very early stage of their collective existence they believed they had detected a divine scheme for the human race, of which their own society was to be a pilot. They worked out their role in immense detail. They clung to it with heroic persistence in the face of savage suffering… The Jewish vision became the prototype for many similar grand designs for humanity; both divine and man-made. The Jews, therefore, stand right at the centre of the perennial attempt to give human life the dignity of a purpose.",
      author: "Paul Johnson",
    },
    {
      text: "All beginnings are hard. I can remember hearing my mother murmur those words while I lay in bed with fever. “Children are often sick, darling. That’s the way it is with children. All beginnings are hard. You’ll be all right soon.” I remember bursting into tears one evening because a passage of Bible commentary had proved too difficult for me to understand. I was about nine years old at the time. “You want to understand everything immediately?” my father said. “Just like that? You only began to study this commentary last week. All beginnings are hard. You have to work at the job of studying. Go over it again and again.” The man who later guided me in my studies would welcome me warmly into his apartment and, when we sat at his desk, say to me in his gentle voice, “Be patient, David. The midrash says, ‘All beginnings are hard.’ You cannot swallow all the world at one time.” I say to myself today when I stand before a new class at the beginning of a school year or am about to start a new book or research paper: All beginnings are hard. Teaching the way I do is particularly hard, for I touch the raw nerves of faith, the beginnings of things. Often students are shaken. I say to them what was said to me: “Be patient. You are learning a new way of understanding the Bible. All beginnings are hard.” And sometimes I add what I have learned on my own: “Especially a beginning that you make by yourself. That’s the hardest beginning of all.”",
      author: "Chaim Potok, In the Beginning",
    },
    {
      text: "Alice laughed. “There’s no use trying,” she said, “one can’t believe impossible things.” “I daresay you haven’t had much practice,” said the Queen. “When I was your age, I always did it for half-an-hour a day. Why, sometimes I’ve believed as many as six impossible things before breakfast.”",
      author: "Lewis Carroll, Through the Looking-Glass",
    },
    {
      text: "Not all those who wander are lost.",
      author: "J.R.R. Tolkien",
    },
    {
      text: "What is the Jew?… What kind of unique creature is this whom all the rulers of all the nations of the world have disgraced and crushed and expelled and destroyed; persecuted, burned and drowned, and who, despite their anger and their fury, continues to live and to flourish. What is this Jew whom they have never succeeded in enticing with all the enticements in the world, whose oppressors and persecutors only suggested that he deny (and disown) his religion and cast aside the faithfulness of his ancestors? The Jew is the symbol of eternity…. He is the one who for so long had guarded the prophetic message and transmitted it to all mankind. A people such as this can never disappear. The Jew is eternal. He is the embodiment of eternity.",
      author: "Leo Tolstoy",
    },
    {
      text: "What we call the beginning is often the end, and to make an end is to make a beginning. The end is where we start from…. We shall not cease from exploration, and the end of all our exploring will be to arrive where we started, and know the place for the first time.",
      author: "T.S. Eliot, Little Gidding",
    },
    {
      text: "Though no one can go back and make a brand new start, anyone can start from now and make a brand new ending.",
      author: "Carl Bard",
    },
    {
      text: "In the beginning, the universe was created. This has made a lot of people very angry and has been widely regarded as a bad idea.",
      author: "Douglas Adams",
    },
    {
      text: "It is a tremendous act of violence to begin anything. I am not able to begin. I simply skip what should be the beginning.",
      author: "Rainer Maria Rilke",
    },
    {
      text: "There will come a time when you believe everything is finished. That will be the beginning.",
      author: "Louis L’Amour",
    },
    {
      text: "I like nonsense, it wakes up the brain cells. Fantasy is a necessary ingredient in living. It’s a way of looking at life through the wrong end of a telescope, which is what I do, and that enables you to laugh at life’s realities.",
      author: "Dr. Seuss",
    },
    {
      text: "You have to do your own growing, no matter how tall your grandfather was.",
      author: "Irish Proverb",
    },
    {
      text: "Living is a form of not being sure, not knowing what next or how. The moment you know how, you begin to die a little. The artist never entirely knows. We guess. We may be wrong, but we take leap after leap in the dark.",
      author: "Agnes de Mille",
    },
    {
      text: "We must walk consciously only part way toward our goal, and then leap in the dark to our success.",
      author: "Henry David Thoreau",
    },
    {
      text: "Do I contradict myself?\nVery well then, I contradict myself.\n(I am large, I contain multitudes.)",
      author: "Walt Whitman",
    },
    {
      text: "I would hurl words into this darkness and wait for an echo, and if an echo sounded, no matter how faintly, I would send other words to tell, to march, to fight, to create a sense of hunger for life that gnaws in us all.",
      author: "Richard Wright",
    },
    {
      text: "The condition of mankind is, and always has been, so miserable and depraved that, if anyone were to say to the poet: “For God’s sake stop singing and do something useful like putting on the kettle or fetching bandages,” what reason could he give for refusing? But nobody says this. The self-appointed unqualified nurse says: “You are to sing the patient a song which will make him believe that I, and I alone, can cure him. If you can’t or won’t, I shall confiscate your passport and send you to the mines.” And the poor patient in his delirium cries: “Please sing me a song which will give me sweet dreams instead of nightmares. If you succeed, I will give you a penthouse in New York or a ranch in Arizona.”",
      author: "W.H. Auden",
    },
    {
      text: "I wanted a perfect ending. Now I’ve learned, the hard way, that some poems don’t rhyme, and some stories don’t have a clear beginning, middle, and end. Life is about not knowing, having to change, taking the moment and making the best of it, without knowing what’s going to happen next. Delicious Ambiguity.",
      author: "Gilda Radner",
    },
    {
      text: "Be ashamed to die until you have won a victory for humanity.",
      author: "Horace Mann",
    },
    {
      text: "One of the illusions of life is that the present hour is not the critical, decisive hour. Write it on your heart that every day is the best day of the year. He only is rich who owns the day, and no one owns the day who allows it to be invaded with worry, fret, and anxiety. Finish every day and be done with it…. You have done what you could; some blunders and absurdities have crept in; forget them as soon as you can. Tomorrow is a new day; you shall begin it well and serenely and with too high a spirit to be cumbered by your old nonsense.",
      author: "Ralph Waldo Emerson",
    },
    {
      text: "I never thought I’d live to see eighteen. Isn’t that dumb? Every day I look in the mirror and say “What? You still here? Man! Like even today. I woke up this morning, you know? And the sun was shining and everything was nice, and I thought, this is going to be one terrific day, so you better live it up, boy, because tomorrow, maybe you’ll be gone.”",
      author: "James Dean, Rebel Without a Cause",
    },
    {
      text: "A word is dead when it is said, some say. I say it just begins to live that day.",
      author: "Emily Dickinson",
    },
    {
      text: "The aim of life is to live, and to live means to be aware, joyously, drunkenly, serenely, divinely aware.",
      author: "Henry Miller",
    },
    {
      text: "Be glad of life, because it gives you the chance to love and to work and to play and to look up at the stars; to be satisfied with your possessions; to despise nothing in the world except falsehood and meanness, and to fear nothing except cowardice; to be governed by your admirations rather than by your disgusts; to covet nothing that is your neighbor’s except his kindness of heart and gentleness of manners; to think seldom of your enemies, often of your friends, and to spend as much time as you can, with body and with spirit. These are little guideposts on the footpath to peace.",
      author: "Henry van Dyke",
    },
    {
      text: "Let’s think the unthinkable, let’s do the undoable. Let’s prepare to grapple with the ineffable itself, and see if we may not eff it after all.",
      author: "Douglas Adams",
    },
    {
      text: "Hello, babies. Welcome to Earth. It’s hot in the summer and cold in the winter. It’s round and wet and crowded. At the outside, babies, you’ve got about a hundred years here. There’s only one rule that I know of, babies—:\n“God damn it, you’ve got to be kind.”",
      author: "Kurt Vonnegut",
    },
    {
      text: "My grandfather was a painter. He was looking at me and he said, “Harry, there’s two kinds of tired. There’s good-tired, and there’s bad-tired. Ironically enough, bad-tired can be a day that you won. But you won other people’s battles, you lived other people’s days, other people’s agendas, other people’s dreams—and when it was all over there was very little you in there. And when you hit the hay at night, somehow you toss and turn, you don’t settle easy. He said, ‘Good-tired, ironically enough, can be a day that you lost. But you don’t even have to tell yourself, because you know you fought your battles, you chased your dreams, you lived your days, and when you hit the hay at night, you settle easy. You sleep the sleep of the just, and you can say take me away.’” He said, “Harry, all my life I’ve painted. God I would love to have been more successful, but I’ve painted and I’ve painted, and I am good-tired, and they can take me away.”",
      author: "Harry Chapin",
    },
    {
      text: "For a long time it had seemed to me that life was about to begin—real life. But there was always some obstacle in the way. Something to be got through first, some unfinished business, time still to be served, a debt to be paid. Then life would begin. At last it dawned on me that these obstacles were my life.",
      author: "Alfred D’Souza",
    },
    {
      text: "The people for me are the mad ones, the ones who are mad to live, mad to talk, mad to be saved, desirous of everything at the same time, the ones who never yawn or say a commonplace thing, but burn, burn, burn like fabulous yellow roman candles exploding like spiders across the stars and in the middle you see the blue centerlight pop and everybody goes “Awww!”",
      author: "Jack Kerouac",
    },
    {
      text: "Here’s to the crazy ones. The misfits. The rebels. The troublemakers. The round pegs in the square holes. The ones who see things differently. They’re not fond of rules, and they have no respect for the status quo. You can quote them, disagree with them, glorify or vilify them. About the only thing you can’t do is ignore them. Because they change things. They push the human race forward. And while some may see them as the crazy ones, we see genius. Because the people who are crazy enough to think they can change the world are the ones who do.",
      author:
        "Jack Kerouac (commonly attributed; actually from Apple’s “Think Different” campaign, inspired by Kerouac)",
    },
  ],
};

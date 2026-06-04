const dims = ["context", "boundary", "generative", "taste", "stance", "groundedness"];
const auxFields = ["skillable", "expressive", "noise"];
const dimLabels = {
  context: "读空气",
  boundary: "识边界",
  generative: "会生成",
  taste: "有品味",
  stance: "有立场",
  groundedness: "有来处",
};

const dimDescriptions = {
  context: "看见任务说明之外的东西",
  boundary: "知道模板什么时候会失效",
  generative: "长出新想法，而不只是选答案",
  taste: "判断什么更好，而不只是更标准",
  stance: "有目标函数之外的取舍",
  groundedness: "判断从真实经历里长出来",
};

const dimHighCopy = {
  context: "你能看见话外之音。别人看到任务，你看到关系、时机和没说出口的风险。",
  boundary: "你不迷信模板，也不为了显得独特而反模板。你知道方法什么时候有用，也知道什么时候该停。",
  generative: "你不只是会选答案，你会长出新角度。你的想法不是模板拼贴，而是带着个人判断。",
  taste: "你能识别“正确但没灵魂”的东西。你不是只看流畅和专业，而是在看取舍、分寸和气质。",
  stance: "你不是只有目标函数。你知道有些东西不能为了效率轻易牺牲，也能说出冲突在哪里。",
  groundedness: "你的判断不是信息堆出来的，而是从真实经历里长出来的。",
};

const dimLowCopy = {
  context: "你很容易相信任务的字面意思。下一步可以练习问一句：这件事真正影响谁？",
  boundary: "你对流程比较友好，但容易被流程带着走。真正的经验，常常藏在“不适用”的地方。",
  generative: "你更擅长在已有选项里做选择。想提高含活人量，可以试着先改写问题，再寻找答案。",
  taste: "你容易把规范、完整、流畅当成好。下一步可以练习问：它准确吗？有判断吗？",
  stance: "你很会完成目标，但有时会太快接受目标本身。人最难被复制的部分，往往从“我不这样做”开始。",
  groundedness: "你的观点还缺少来处。多经历不是重点，重点是让经历沉淀成下一次选择的理由。",
};

const chapters = [
  "开始蒸馏",
  "读懂空气",
  "模板失灵",
  "品味残留",
  "生成活人",
  "蒸不出来"
];
const chapterSubtitles = [
  "正在读取你的工作流、话术和那些你以为别人看不出来的小动作。",
  "任务说明之外，通常还有一整屋子的空气。",
  "最佳实践很好，直到它开始假装自己永远正确。",
  "有些东西不是不专业，只是太像正确答案。",
  "现在检测你是不是只会选答案，还是能长出新东西。",
  "最后检测：哪些判断不该被外包给工具。",
];
const progressHints = ["工作流", "空气感", "模板边界", "品味残留", "生成能力", "价值和来处"];
const questions = [
  {
    "id": 1,
    "chapter": 0,
    "title": "有人想把你做成“同事 Skill”，你第一反应是？",
    "options": [
      {
        "id": "A",
        "text": "挺好，顺便帮我整理一下工作流",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "可以，但它大概学不全我的判断",
        "score": {
          "context": 0,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 1,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "先说清楚：资料从哪来，谁授权？",
        "score": {
          "context": 0,
          "boundary": 1,
          "generative": 0,
          "taste": 0,
          "stance": 3,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "我也说不清我怎么做事，但有些东西不能拿走",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 1,
          "groundedness": 2,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      }
    ]
  },
  {
    "id": 2,
    "chapter": 0,
    "title": "如果 AI 学你工作，最容易学错什么？",
    "options": [
      {
        "id": "A",
        "text": "我的格式和话术",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "我怎么排优先级",
        "score": {
          "context": 2,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 1,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "我什么时候不按流程走",
        "score": {
          "context": 1,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "我觉得“哪里不对劲”的那一下",
        "score": {
          "context": 2,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 2,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      }
    ]
  },
  {
    "id": 3,
    "chapter": 0,
    "title": "你写工作文档时，更像哪种？",
    "options": [
      {
        "id": "A",
        "text": "写成别人照做就行",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "写步骤，也写什么时候不能照做",
        "score": {
          "context": 0,
          "boundary": 3,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 1,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "写到关键处，会标一句“这里要看情况”",
        "score": {
          "context": 1,
          "boundary": 1,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 1,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "很少写，很多东西只有我在场才知道",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 0,
          "noise": 2
        }
      }
    ]
  },
  {
    "id": 4,
    "chapter": 0,
    "title": "同事问“这事有标准流程吗”，你会怎么回？",
    "options": [
      {
        "id": "A",
        "text": "有，我发你",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "有，但先看这次像不像",
        "score": {
          "context": 1,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "有，不过先确认哪里不能照抄",
        "score": {
          "context": 1,
          "boundary": 3,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "如果流程就够了，也不用来问我",
        "score": {
          "context": 0,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      }
    ]
  },
  {
    "id": 5,
    "chapter": 0,
    "title": "如果你是一条知识库内容，你更像：",
    "options": [
      {
        "id": "A",
        "text": "可复用 SOP",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "带注意事项的操作指南",
        "score": {
          "context": 0,
          "boundary": 1,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 1,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "常见例外和判断依据",
        "score": {
          "context": 1,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 2,
          "skillable": 1,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "此处需要活人判断",
        "score": {
          "context": 1,
          "boundary": 1,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      }
    ]
  },
  {
    "id": 6,
    "chapter": 0,
    "title": "如果 AI 替你上班一天，最可能出什么问题？",
    "options": [
      {
        "id": "A",
        "text": "问题不大，交付还挺稳",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "能做大半，但优先级会错",
        "score": {
          "context": 2,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 1,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "事情做对了，方向却偏了",
        "score": {
          "context": 1,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 2,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "它不知道什么时候该停",
        "score": {
          "context": 1,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 2,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 7,
    "chapter": 1,
    "title": "会上一个方案看着没毛病，但你觉得不对。你会：",
    "options": [
      {
        "id": "A",
        "text": "先看数据",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "问它在哪些条件下不成立",
        "score": {
          "context": 1,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "把“不对劲”变成一个可验证的风险",
        "score": {
          "context": 2,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "看看谁没说话，为什么没说",
        "score": {
          "context": 3,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 8,
    "chapter": 1,
    "title": "别人发来“你方便再看看吗”，你会理解成：",
    "options": [
      {
        "id": "A",
        "text": "他就是让我看看",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "可能有问题，但不好直说",
        "score": {
          "context": 1,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "八成是想让我兜底",
        "score": {
          "context": 1,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 2
        }
      },
      {
        "id": "D",
        "text": "先看关系、时间点和上下文",
        "score": {
          "context": 3,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 9,
    "chapter": 1,
    "title": "新人照文档做错了，你第一反应是：",
    "options": [
      {
        "id": "A",
        "text": "文档可能没写清",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "他可能没懂前提",
        "score": {
          "context": 1,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "这事可能不能只靠文档",
        "score": {
          "context": 0,
          "boundary": 1,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      },
      {
        "id": "D",
        "text": "我想知道他为什么会那样理解",
        "score": {
          "context": 3,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 2,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 10,
    "chapter": 1,
    "title": "大家都说“先快速推进”，你会：",
    "options": [
      {
        "id": "A",
        "text": "可以，先往前走",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "先问快的代价是什么",
        "score": {
          "context": 1,
          "boundary": 1,
          "generative": 0,
          "taste": 0,
          "stance": 1,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "找出没人愿意说的风险",
        "score": {
          "context": 2,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 1,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "判断这是不是在集体逃避",
        "score": {
          "context": 2,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 2,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      }
    ]
  },
  {
    "id": 11,
    "chapter": 1,
    "title": "你判断一个人靠谱不靠谱，最看重：",
    "options": [
      {
        "id": "A",
        "text": "交付稳不稳",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "关键时刻能不能兜住",
        "score": {
          "context": 1,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 2,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "怎么处理模糊、冲突和坏消息",
        "score": {
          "context": 2,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 1,
          "groundedness": 2,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "没人要求时会不会多想一步",
        "score": {
          "context": 1,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 1,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 12,
    "chapter": 1,
    "title": "别人说“都可以，你决定吧”，你通常会：",
    "options": [
      {
        "id": "A",
        "text": "直接选一个效率最高的",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "先确认他是不是真的无所谓",
        "score": {
          "context": 2,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "问清楚他最怕哪种结果",
        "score": {
          "context": 3,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "看这句话背后是不是在回避责任",
        "score": {
          "context": 2,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      }
    ]
  },
  {
    "id": 13,
    "chapter": 2,
    "title": "面对一个很模糊的任务，你第一步是：",
    "options": [
      {
        "id": "A",
        "text": "拆任务，列步骤",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "确认目标、限制和成功标准",
        "score": {
          "context": 1,
          "boundary": 1,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "找真正拍板的人和隐含期待",
        "score": {
          "context": 3,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "先判断这个任务是不是问错了",
        "score": {
          "context": 1,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 1,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      }
    ]
  },
  {
    "id": 14,
    "chapter": 2,
    "title": "模板答案和你的直觉冲突时，你会：",
    "options": [
      {
        "id": "A",
        "text": "先信模板",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "检查直觉有没有依据",
        "score": {
          "context": 0,
          "boundary": 1,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "做个小验证，看谁更接近现实",
        "score": {
          "context": 0,
          "boundary": 3,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 2,
          "skillable": 0,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "先问这个模板是为谁设计的",
        "score": {
          "context": 0,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 1,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 15,
    "chapter": 2,
    "title": "你最信任哪种“最佳实践”？",
    "options": [
      {
        "id": "A",
        "text": "被很多人验证过的",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "写清楚适用条件的",
        "score": {
          "context": 0,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "能被小范围试错的",
        "score": {
          "context": 0,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "让我知道什么时候别用它的",
        "score": {
          "context": 0,
          "boundary": 3,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 16,
    "chapter": 2,
    "title": "一个流程执行得很顺，但结果不太好，你会先怀疑：",
    "options": [
      {
        "id": "A",
        "text": "执行不到位",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "指标选错了",
        "score": {
          "context": 0,
          "boundary": 1,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "流程假设过期了",
        "score": {
          "context": 0,
          "boundary": 3,
          "generative": 0,
          "taste": 0,
          "stance": 1,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "一开始就把问题定义窄了",
        "score": {
          "context": 0,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 2,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 17,
    "chapter": 2,
    "title": "老板让你“按行业通用打法来”，你会：",
    "options": [
      {
        "id": "A",
        "text": "找几个案例照着搭",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "先列出通用打法的优缺点",
        "score": {
          "context": 1,
          "boundary": 1,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "看我们和行业样板差在哪",
        "score": {
          "context": 2,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "先问这次为什么一定要通用",
        "score": {
          "context": 1,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      }
    ]
  },
  {
    "id": 18,
    "chapter": 2,
    "title": "你遇到一个“看起来很聪明”的方案，最警惕：",
    "options": [
      {
        "id": "A",
        "text": "它是不是太复杂",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 1,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      },
      {
        "id": "B",
        "text": "它是不是难落地",
        "score": {
          "context": 0,
          "boundary": 1,
          "generative": 0,
          "taste": 1,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "它解决的是不是真问题",
        "score": {
          "context": 0,
          "boundary": 2,
          "generative": 0,
          "taste": 2,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "它是不是只是显得很聪明",
        "score": {
          "context": 0,
          "boundary": 1,
          "generative": 0,
          "taste": 3,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      }
    ]
  },
  {
    "id": 19,
    "chapter": 3,
    "title": "看到一篇很流畅、很标准、很像 AI 写的文章，你会觉得：",
    "options": [
      {
        "id": "A",
        "text": "挺好，省事",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "能用，但没有判断痕迹",
        "score": {
          "context": 0,
          "boundary": 1,
          "generative": 0,
          "taste": 2,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "它没有冒险，所以也没有选择",
        "score": {
          "context": 0,
          "boundary": 1,
          "generative": 0,
          "taste": 2,
          "stance": 1,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "我看不出作者本人在哪里",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 2,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      }
    ]
  },
  {
    "id": 20,
    "chapter": 3,
    "title": "四个方案里，你更喜欢哪种？",
    "options": [
      {
        "id": "A",
        "text": "稳妥、清楚、可复制",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "有一点新意，风险可控",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 1,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "不完美，但判断很明确",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 2,
          "taste": 2,
          "stance": 1,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "一看就不是模板生成的",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 1,
          "taste": 1,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      }
    ]
  },
  {
    "id": 21,
    "chapter": 3,
    "title": "做创意时，你最怕什么？",
    "options": [
      {
        "id": "A",
        "text": "不够清楚",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "不够专业",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "太像别人做过的",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 2,
          "taste": 1,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "只是把正确答案拼在一起",
        "score": {
          "context": 0,
          "boundary": 1,
          "generative": 3,
          "taste": 2,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 22,
    "chapter": 3,
    "title": "哪句话最有“活人味”？",
    "options": [
      {
        "id": "A",
        "text": "建议按最佳实践推进",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "建议先对齐目标和资源",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "这个方案能赢，但赢得不好看",
        "score": {
          "context": 1,
          "boundary": 0,
          "generative": 0,
          "taste": 2,
          "stance": 2,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "我不反对，但我想先说清楚哪里不舒服",
        "score": {
          "context": 1,
          "boundary": 0,
          "generative": 0,
          "taste": 1,
          "stance": 1,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 23,
    "chapter": 3,
    "title": "你怎么看“高级感”？",
    "options": [
      {
        "id": "A",
        "text": "更克制、更统一",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 1,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "看起来不廉价",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 1,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "分寸、取舍和气质都对",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 3,
          "stance": 1,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "不是堆元素，是知道不放什么",
        "score": {
          "context": 0,
          "boundary": 1,
          "generative": 0,
          "taste": 3,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 24,
    "chapter": 3,
    "title": "你最受不了哪种“专业感”？",
    "options": [
      {
        "id": "A",
        "text": "术语很多，但没说人话",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 1,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "页面很满，但没有重点",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 1,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "很正确，但没有取舍",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 3,
          "stance": 2,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "很像样，但没有人负责判断",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 2,
          "stance": 2,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 25,
    "chapter": 4,
    "title": "接到“做一版更高级的方案”，你第一步会：",
    "options": [
      {
        "id": "A",
        "text": "找高级感参考，整理模板",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "先问“高级”到底服务什么目标",
        "score": {
          "context": 2,
          "boundary": 0,
          "generative": 1,
          "taste": 1,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "找出这个需求里最空的词",
        "score": {
          "context": 0,
          "boundary": 2,
          "generative": 1,
          "taste": 1,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "先做一个有明确气质的样本",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 3,
          "taste": 2,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 26,
    "chapter": 4,
    "title": "要把一句套话改得像人写的，你会先：",
    "options": [
      {
        "id": "A",
        "text": "加一点情绪和修辞",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 1,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 0,
          "noise": 1
        }
      },
      {
        "id": "B",
        "text": "找到它真正想打动谁",
        "score": {
          "context": 2,
          "boundary": 0,
          "generative": 1,
          "taste": 1,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "删掉套话，留下一个具体判断",
        "score": {
          "context": 0,
          "boundary": 1,
          "generative": 3,
          "taste": 2,
          "stance": 1,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "放进一点自己的经历感",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 1,
          "taste": 1,
          "stance": 0,
          "groundedness": 2,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      }
    ]
  },
  {
    "id": 27,
    "chapter": 4,
    "title": "你提出新想法时，更常从哪里开始？",
    "options": [
      {
        "id": "A",
        "text": "现有框架缺哪块",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "现有方案哪里让人不满意",
        "score": {
          "context": 1,
          "boundary": 1,
          "generative": 1,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "这个问题是不是问错了",
        "score": {
          "context": 0,
          "boundary": 2,
          "generative": 1,
          "taste": 0,
          "stance": 1,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "最近的真实经历里，有什么能和它连上",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 3,
          "taste": 1,
          "stance": 0,
          "groundedness": 2,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 28,
    "chapter": 4,
    "title": "如果要让一个普通方案更有生命力，你会先加：",
    "options": [
      {
        "id": "A",
        "text": "更完整的结构",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "更清楚的目标",
        "score": {
          "context": 1,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "一个别人没看到的矛盾",
        "score": {
          "context": 1,
          "boundary": 1,
          "generative": 3,
          "taste": 1,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "一个只有你会这样处理的角度",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 3,
          "taste": 2,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      }
    ]
  },
  {
    "id": 29,
    "chapter": 4,
    "title": "你做东西时，什么时候最容易进入状态？",
    "options": [
      {
        "id": "A",
        "text": "目标清楚、资源齐全的时候",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "有一个具体问题要解决的时候",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 1,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "发现现有答案都不太对的时候",
        "score": {
          "context": 0,
          "boundary": 2,
          "generative": 2,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "某个经历突然和问题接上的时候",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 3,
          "taste": 1,
          "stance": 0,
          "groundedness": 2,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 30,
    "chapter": 4,
    "title": "别人问你“有没有更不一样的想法”，你会：",
    "options": [
      {
        "id": "A",
        "text": "多给几个备选方向",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 1,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "先问“不一样”要解决什么",
        "score": {
          "context": 1,
          "boundary": 1,
          "generative": 1,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "换一个问题问法",
        "score": {
          "context": 0,
          "boundary": 2,
          "generative": 2,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "拿一个有风险但有判断的方向出来",
        "score": {
          "context": 0,
          "boundary": 1,
          "generative": 3,
          "taste": 1,
          "stance": 1,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 31,
    "chapter": 5,
    "title": "目标和价值感冲突时，你会：",
    "options": [
      {
        "id": "A",
        "text": "先完成目标",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "找一个折中方案",
        "score": {
          "context": 1,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 1,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "说清冲突，并提出替代做法",
        "score": {
          "context": 1,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 3,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "宁愿变慢，也不想变成那样",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 2,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      }
    ]
  },
  {
    "id": 32,
    "chapter": 5,
    "title": "如果别人复刻了你的工作产出，你会觉得：",
    "options": [
      {
        "id": "A",
        "text": "说明我方法沉淀得好",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "有点不爽，但也合理",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "他复刻不了我为什么那样做",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 1,
          "groundedness": 2,
          "skillable": 0,
          "expressive": 0,
          "noise": 1
        }
      },
      {
        "id": "D",
        "text": "如果只剩产出能证明我，那我该升级了",
        "score": {
          "context": 0,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 2,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 33,
    "chapter": 5,
    "title": "你改变一个重要观点，通常是因为：",
    "options": [
      {
        "id": "A",
        "text": "看到了新信息",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "听到了更强的逻辑",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "现实给了我一个反例",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 3,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "发现旧观点伤害了我在乎的东西",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 3,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 34,
    "chapter": 5,
    "title": "你最不希望 AI 替你决定什么？",
    "options": [
      {
        "id": "A",
        "text": "我的日程安排",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 1,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "我的表达风格",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 1,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "哪个问题值得投入",
        "score": {
          "context": 0,
          "boundary": 1,
          "generative": 0,
          "taste": 0,
          "stance": 3,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "我愿意成为什么样的人",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 3,
          "groundedness": 1,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 35,
    "chapter": 5,
    "title": "你觉得“经验”最有价值的地方是：",
    "options": [
      {
        "id": "A",
        "text": "做得更快",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "少踩坑",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 1,
          "expressive": 0,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "知道哪些坑值得踩",
        "score": {
          "context": 0,
          "boundary": 1,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 3,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "能闻出事情开始变味的时刻",
        "score": {
          "context": 2,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 3,
          "skillable": 0,
          "expressive": 0,
          "noise": 0
        }
      }
    ]
  },
  {
    "id": 36,
    "chapter": 5,
    "title": "你希望自己在 AI 时代更像：",
    "options": [
      {
        "id": "A",
        "text": "一个高质量可调用模块",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 2,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "B",
        "text": "一个会用 AI 放大自己的专业人",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 0,
          "taste": 0,
          "stance": 0,
          "groundedness": 1,
          "skillable": 1,
          "expressive": 2,
          "noise": 0
        }
      },
      {
        "id": "C",
        "text": "一个知道何时该用、何时不该用工具的人",
        "score": {
          "context": 1,
          "boundary": 2,
          "generative": 0,
          "taste": 0,
          "stance": 3,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 1,
          "noise": 0
        }
      },
      {
        "id": "D",
        "text": "一个永远独特、拒绝被定义的人",
        "score": {
          "context": 0,
          "boundary": 0,
          "generative": 1,
          "taste": 0,
          "stance": 0,
          "groundedness": 0,
          "skillable": 0,
          "expressive": 0,
          "noise": 2
        }
      }
    ]
  }
];
const modes = {
  standard: { label: "标准版", description: "24 题，适合快速测含活人量。", questionIds: [1, 3, 4, 6, 7, 8, 10, 12, 13, 14, 16, 18, 19, 20, 22, 24, 25, 26, 27, 30, 31, 32, 35, 36] },
  full: { label: "完整版", description: "36 题，适合深度检测你的不可蒸馏成分。", questionIds: questions.map((question) => question.id) },
};
const coreAnswers = { 3: "B", 7: "C", 14: "C", 31: "C", 36: "C" };

let modeKey = "standard";
let activeQuestions = [];
let current = 0;
let answers = {};

const el = {
  intro: document.getElementById("intro"),
  tester: document.getElementById("tester"),
  results: document.getElementById("results"),
  startBtn: document.getElementById("startBtn"),
  retakeBtn: document.getElementById("retakeBtn"),
  prevBtn: document.getElementById("prevBtn"),
  progressText: document.getElementById("progressText"),
  chapterText: document.getElementById("chapterText"),
  progressFill: document.getElementById("progressFill"),
  stepDots: document.getElementById("stepDots"),
  questionChapter: document.getElementById("questionChapter"),
  questionSubtitle: document.getElementById("questionSubtitle"),
  questionTitle: document.getElementById("questionTitle"),
  options: document.getElementById("options"),
  resultTitle: document.getElementById("resultTitle"),
  resultType: document.getElementById("resultType"),
  resultCopy: document.getElementById("resultCopy"),
  heartLine: document.getElementById("heartLine"),
  shareLine: document.getElementById("shareLine"),
  humanScore: document.getElementById("humanScore"),
  undistillableScore: document.getElementById("undistillableScore"),
  skillFitScore: document.getElementById("skillFitScore"),
  versionScore: document.getElementById("versionScore"),
  dimensionBars: document.getElementById("dimensionBars"),
  personalNotes: document.getElementById("personalNotes"),
  modeButtons: document.querySelectorAll("[data-mode]"),
};

function setMode(nextMode) {
  modeKey = nextMode;
  activeQuestions = modes[modeKey].questionIds.map((id) => questions.find((question) => question.id === id));
  answers = {};
  current = 0;
  el.modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === modeKey));
}

function start() {
  el.intro.classList.add("hidden");
  el.results.classList.add("hidden");
  el.tester.classList.remove("hidden");
  renderQuestion();
}

function restart() {
  answers = {};
  current = 0;
  el.results.classList.add("hidden");
  el.tester.classList.add("hidden");
  el.intro.classList.remove("hidden");
}

function renderQuestion() {
  const question = activeQuestions[current];
  const answeredCount = activeQuestions.filter((item) => answers[item.id]).length;
  el.progressText.textContent = `第 ${current + 1} / ${activeQuestions.length} 题`;
  el.chapterText.textContent = `正在蒸馏第 ${question.chapter + 1} 层：${progressHints[question.chapter]}`;
  el.progressFill.style.width = `${((current + 1) / activeQuestions.length) * 100}%`;
  el.questionChapter.textContent = `第 ${question.chapter + 1} 章：${chapters[question.chapter]}`;
  el.questionSubtitle.textContent = chapterSubtitles[question.chapter];
  el.questionTitle.textContent = `Q${current + 1} ${question.title}`;
  el.options.innerHTML = "";

  question.options.forEach((option) => {
    const button = document.createElement("button");
    button.className = `option ${answers[question.id] === option.id ? "selected" : ""}`;
    button.innerHTML = `<span class="option-letter">${option.id}</span><span class="option-text">${option.text}</span>`;
    button.addEventListener("click", () => {
      answers[question.id] = option.id;
      if (current < activeQuestions.length - 1) {
        current += 1;
        renderQuestion();
      } else {
        showResults();
      }
    });
    el.options.appendChild(button);
  });

  el.prevBtn.disabled = current === 0;
  renderStepDots(answeredCount);
}

function renderStepDots(answeredCount) {
  el.stepDots.innerHTML = "";
  activeQuestions.forEach((question, index) => {
    const dot = document.createElement("span");
    dot.className = `${answers[question.id] ? "done" : ""} ${index === current ? "active" : ""}`;
    dot.setAttribute("aria-label", `第 ${index + 1} 题${answers[question.id] ? "已完成" : "未完成"}`);
    el.stepDots.appendChild(dot);
  });
}

function scoreAnswers() {
  const totals = Object.fromEntries([...dims, ...auxFields].map((key) => [key, 0]));
  let answered = 0;
  let matureHits = 0;

  activeQuestions.forEach((question) => {
    const answer = answers[question.id];
    const option = question.options.find((item) => item.id === answer);
    if (!option) return;
    answered += 1;
    Object.entries(option.score).forEach(([key, value]) => { totals[key] += value; });
    if (coreAnswers[question.id] === answer) matureHits += 1;
  });

  const bankMax = calculateBankMax(activeQuestions);
  const positiveRaw = dims.reduce((sum, key) => sum + totals[key], 0);
  const positiveScore = safeRatio(positiveRaw, bankMax.positive);
  const expressiveScore = safeRatio(totals.expressive, bankMax.expressive);
  const skillableScore = safeRatio(totals.skillable, bankMax.skillable);
  const noiseScore = safeRatio(totals.noise, bankMax.noise);
  const balanceScore = balance(dims.map((key) => totals[key]));
  const healthyExpressionBonus = Math.min(expressiveScore, positiveScore) * 0.15;
  const skillPenalty = skillableScore <= 0.45 ? 0 : (skillableScore - 0.45) * (1 - positiveScore) * 0.35;
  const noisePenalty = noiseScore * 0.18;
  const maturityBonus = matureHits <= 1 ? 0 : matureHits <= 3 ? 0.025 : 0.05;
  const measuredHumanScore = positiveScore * 0.7 + healthyExpressionBonus + balanceScore * 0.1 + maturityBonus - skillPenalty - noisePenalty;
  const undistillableScore = positiveScore * 0.75 + balanceScore * 0.1 + healthyExpressionBonus + maturityBonus * 0.7 - noiseScore * 0.1 - skillPenalty * 0.5;
  const skillFit = skillableScore * 0.55 + expressiveScore * 0.3 + (1 - noiseScore) * 0.15;

  return {
    totals,
    bankMax,
    answered,
    positiveRaw,
    positiveScore,
    expressiveScore,
    skillableScore,
    noiseScore,
    balanceScore,
    displayHumanPercent: displayHumanScore(measuredHumanScore, noiseScore),
    undistillablePercent: clamp(Math.round(undistillableScore * 100), 0, 100),
    skillFitPercent: clamp(Math.round(skillFit * 100), 0, 100),
  };
}

function calculateBankMax(bankQuestions) {
  const bankMax = Object.fromEntries([...dims, ...auxFields].map((key) => [key, 0]));
  bankMax.positive = 0;
  bankQuestions.forEach((question) => {
    bankMax.positive += Math.max(...question.options.map((option) => dims.reduce((sum, key) => sum + option.score[key], 0)));
    [...dims, ...auxFields].forEach((key) => {
      bankMax[key] += Math.max(...question.options.map((option) => option.score[key]));
    });
  });
  return bankMax;
}

function displayHumanScore(measuredHumanScore, noiseScore) {
  let score = measuredHumanScore <= 0.05 ? 18 : clamp(Math.round(20 + measuredHumanScore * 85), 20, 100);
  if (noiseScore >= 0.7) score = Math.min(score, 52);
  if (noiseScore >= 0.5) score = Math.min(score, 65);
  return score;
}

function balance(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return clamp(1 - Math.sqrt(variance) / mean, 0, 1);
}

function showResults() {
  const result = scoreAnswers();
  if (result.answered < activeQuestions.length) return;
  el.intro.classList.add("hidden");
  el.tester.classList.add("hidden");
  el.results.classList.remove("hidden");

  const band = resultBand(result.displayHumanPercent);
  const combo = comboResult(result);
  const strongest = strongestDimension(result);
  const weakest = weakestDimension(result);
  el.resultTitle.textContent = band.title;
  el.resultType.textContent = combo.title ? `${combo.title}` : "";
  el.resultCopy.textContent = `${band.copy} ${combo.copy}`;
  el.heartLine.textContent = band.heart;
  el.shareLine.textContent = combo.share || band.share;
  el.humanScore.textContent = `${result.displayHumanPercent}%`;
  el.undistillableScore.textContent = result.undistillablePercent;
  el.skillFitScore.textContent = `${result.skillFitPercent}%`;
  el.versionScore.textContent = `${modes[modeKey].label} · ${activeQuestions.length} 题`;

  renderBars(result);
  renderPersonalNotes(strongest, weakest, result);
}

function renderBars(result) {
  el.dimensionBars.innerHTML = "";
  dims.forEach((key) => {
    const percent = safeRatio(result.totals[key], result.bankMax[key]) * 100;
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span><b>${dimLabels[key]}</b><small>${dimDescriptions[key]}</small></span>
      <div class="bar-track"><div class="bar-fill" style="width:${percent}%"></div></div>
      <strong>${Math.round(percent)}%</strong>
    `;
    el.dimensionBars.appendChild(row);
  });
}

function renderPersonalNotes(strongest, weakest, result) {
  const notes = [dimHighCopy[strongest.key]];
  if (result.displayHumanPercent < 75) notes.push(dimLowCopy[weakest.key]);
  if (result.skillFitPercent >= 60) notes.push("你的方法可复用性很强。让工具负责效率，你负责判断，会是更好的分工。");
  el.personalNotes.innerHTML = "";
  notes.slice(0, 3).forEach((text) => {
    const p = document.createElement("p");
    p.textContent = text;
    el.personalNotes.appendChild(p);
  });
}

function strongestDimension(result) {
  return dims.map((key) => ({ key, percent: safeRatio(result.totals[key], result.bankMax[key]) })).sort((a, b) => b.percent - a.percent)[0];
}

function weakestDimension(result) {
  return dims.map((key) => ({ key, percent: safeRatio(result.totals[key], result.bankMax[key]) })).sort((a, b) => a.percent - b.percent)[0];
}

function resultBand(score) {
  if (score >= 90) return { title: "高密度活人", copy: "你不是不能被总结，而是一总结就会损失关键成分。别人可以学你的方法、抄你的流程、复刻你的表达，但到了真正要判断、取舍、负责的时候，复制品会开始露馅。", heart: "你最难被蒸馏的部分，不是你的知识，而是你知道什么时候知识不够。", share: "我不是不能蒸，是蒸完会少一个人。" };
  if (score >= 75) return { title: "蒸不干净型", copy: "你的很多能力可以被整理成方法，但真正有价值的地方经常发生在边界、例外、临场和取舍里。蒸馏可以得到你的工作方式，却很难得到你为什么在那个时刻那样判断。", heart: "你的流程能被学走，但关键处会变味。", share: "我的流程能抄，我的判断会变味。" };
  if (score >= 60) return { title: "半蒸半活型", copy: "你一部分很适合被写进说明书，一部分还需要真人在场。你稳定、可协作，也有一些自己的判断；只是这些判断还没有强到让复制品明显失真。", heart: "你不是没有人味，只是有些人味还没长成稳定的判断力。", share: "一半可调用，一半还活着。" };
  if (score >= 45) return { title: "同事 Skill 友好型", copy: "你的工作方式清楚、稳定、可复用，组织知识库会很喜欢你。这不是坏事，说明你可靠、好协作、容易被放大。", heart: "你已经很会成为一个好工具，但还可以更会成为一个人。", share: "组织知识库喜欢我，但我还可以更难蒸一点。" };
  if (score >= 20) return { title: "优质蒸馏原料", copy: "你目前最稳定的价值，主要来自流程、产出和标准执行。你清楚、可靠、适合复用，这当然有价值。", heart: "你不是没有价值，只是你的价值现在太容易被写成说明书。", share: "我很适合被做成 Skill，但这不代表我只能是 Skill。" };
  return { title: "待激活活人变量", copy: "你的选择更偏向稳定、标准、照流程和低风险。它让你很好协作，也让你很容易被系统理解。", heart: "你不是被 AI 打败了，你只是还没有把自己训练成一个更难复制的人。", share: "当前版本较适合蒸馏，等待活人变量升级。" };
}

function comboResult(result) {
  const highHuman = result.displayHumanPercent >= 75;
  const midHuman = result.displayHumanPercent >= 45 && result.displayHumanPercent <= 74;
  if (result.noiseScore >= 0.5) return { title: "伪抗蒸警报", copy: "你的选择里有不少“无法被复制”的成分，但其中一部分更像不稳定，而不是判断力。真正的抗蒸性，是能把这种不对劲说清楚、试出来、承担它。", share: "难蒸不等于高级，有些只是还没说清。" };
  if (highHuman && result.skillFitPercent >= 55) return { title: "可教，但不可替代", copy: "你的方法能被整理，经验能被讲出来，甚至可以教给别人。但复杂场景里，复制品只能学到你的动作，学不到你为什么在这里停一下、绕一下、拒绝一下。", share: "我可以被学习，但很难被复刻。" };
  if (highHuman && result.skillFitPercent < 45) return { title: "野生判断型", copy: "你的人味很强，但蒸馏成本也高。很多判断发生得太快、太现场、太依赖经验和气质。", share: "我不是不能蒸，是蒸馏成本太高。" };
  if (midHuman && result.expressiveScore >= 0.7) return { title: "方法沉淀型", copy: "你很会把事情讲清楚，也愿意把经验变成别人能用的东西。想提高含活人量，不是少写文档，而是在文档里写出边界、例外和判断依据。", share: "我的方法能复用，但边界还要继续长。" };
  if (midHuman && result.skillFitPercent >= 55) return { title: "AI 放大型专业人", copy: "你有不少能力很适合被工具放大：流程、表达、复用、稳定交付。但你的下一步，是让工具负责效率，你负责判断。", share: "工具可以放大我，但不能替我判断。" };
  const groundedRank = dims.map((key) => key).sort((a, b) => result.totals[b] - result.totals[a]).indexOf("groundedness");
  if (midHuman && groundedRank <= 1 && result.expressiveScore < 0.45) return { title: "直觉有来处型", copy: "你有不少判断来自真实经历，所以你的选择并不空。但这些判断现在还太像“我就是觉得”。你不是缺人味，你是缺一个把人味说出来的方式。", share: "我的直觉不是玄学，只是还没翻译完。" };
  if (result.displayHumanPercent < 45 && result.skillFitPercent >= 60) return { title: "优质流程资产", copy: "你很适合被做成一个好 Skill：清楚、稳定、可复用、低噪声。这在团队里很有价值。", share: "我很可靠，也确实有点好蒸。" };
  if (result.displayHumanPercent < 45 && result.skillFitPercent < 40) return { title: "尚未成型型", copy: "你不是不可蒸馏，而是个人价值还不够稳定。现在最重要的不是追求独特，而是先把自己的经验、能力和选择练成形。", share: "不是蒸不出来，是还没长成。" };
  return { title: "", copy: "", share: "" };
}

function safeRatio(value, denominator) { return denominator ? value / denominator : 0; }
function clamp(value, low, high) { return Math.min(Math.max(value, low), high); }

el.modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
el.startBtn.addEventListener("click", start);
el.retakeBtn.addEventListener("click", restart);
el.prevBtn.addEventListener("click", () => { current = Math.max(current - 1, 0); renderQuestion(); });
setMode("standard");

# 分流标签

[English](triage-labels.md) | 中文

| 规范角色          | 本地状态           | 含义                              |
| ----------------- | ------------------ | --------------------------------- |
| `needs-triage`    | `needs-triage`     | 维护者需要评估该问题              |
| `needs-info`      | `needs-info`       | 等待报告者补充信息                |
| `ready-for-agent` | `ready-for-agent`  | 规格完备，可以交由 agent 实现     |
| `ready-for-human` | `ready-for-human`  | 需要由人类实现                    |
| `wontfix`         | `wontfix`          | 不会处理                          |

当 skill 使用规范角色名称时，应将对应的本地值写入 `Status:`。如果仓库的状态词汇发生变化，请编辑右侧列。

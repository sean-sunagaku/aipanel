# Internal Design Comparison

## Comparison Table

| Pattern | Delivery Speed | Class Clarity | Data Ownership Clarity | Session Continuity | Multi-Agent Fit | Testability | Migration Safety | Overall Note |
|---|---|---|---|---|---|---|---|---|
| 1. UseCase-Centric Manager | High | Medium | Medium-Low | Medium | Medium | Medium | Medium | 速く作れるが、複雑化に弱い |
| 2. Session-Centric Aggregate | Medium | Medium | Medium | Very High | Medium | Medium | Medium | follow-up には強いが session が太る |
| 3. Run-Centric Ledger | Medium-High | High | Very High | High | High | High | High | broker + multi-agent を最も整理しやすい |
| 4. Workflow State Machine | Low-Medium | High | High | High | Very High | High | Very High | 強いが今は重い |
| 5. Pipeline Stage Bus | Medium | Medium | Medium-Low | Medium | High | Medium | High | 将来の分散化には向くが抽象化が強い |

## Readout
- `UseCase-Centric Manager` は最初の速さは魅力だが、planner や merger を入れた途端に use case が肥大化しやすい
- `Session-Centric Aggregate` は follow-up を軸にすると強いが、`debug` や `compare` の実行ログまで持たせると session が重くなる
- `Run-Centric Ledger` は会話単位と実行単位を分離でき、今回ほしい「クラス責務」と「データの持ち方」を最も明快にできる
- `Workflow State Machine` は将来の daemon / queue 化まで見据えるなら強いが、今は導入コストが高い
- `Pipeline Stage Bus` は stage 単位の差し替えには強いが、正本データの所在が見えづらくなる

## Decision
内部設計としては `Pattern 3: Run-Centric Ledger` を採用する。  
これは、親シリーズの `CLI Broker` を土台にしつつ、`Multi-Agent Job Orchestrator` の planner / executor / merger / validator を素直に受け止められるためである。

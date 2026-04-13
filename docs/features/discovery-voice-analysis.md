Feature: Discovery voice upload and AI analysis

  Background:
    Given I am logged in as a member of an organisation
    And I am on a Customer Discovery project
    And I have opened the "New discovery entry" drawer

  # --- Voice upload & transcription ---

  Scenario: Upload an audio file and receive a transcript
    Given I select entry type "Interview"
    And I choose an audio file (.m4a, .mp3, .wav, or .webm)
    And I select which speaker is the interviewer
    When I click "Transcribe"
    Then the audio is uploaded to Deepgram
    And the diarized transcript appears in the Notes / transcript field
    And the speaker metrics are computed server-side
    And I see interviewer talk share, WPM, IJL, ISR, and SPR values ready to save

  Scenario: Transcription fails gracefully
    Given I have selected an audio file
    When Deepgram returns an error
    Then I see a clear error message
    And the transcript field remains empty
    And no partial data is saved

  # --- AI analysis ---

  Scenario: Analyse a transcript with AI after paste or upload
    Given the Notes / transcript field contains text
    When I click "Analyse with AI"
    Then Claude Opus analyses the content as a world-class customer discovery expert
    And the Sentiment field is populated without my input
    And the Tags field is populated without my input
    And up to 3 Key quotes are populated with verbatim lines
    And the Jobs to be done field is populated in "Help me ___ so I can ___" format
    And the WTP signal, Problem severity, and Adoption willingness fields are populated
    And I can review and override any field before saving

  Scenario: Analyse non-interview content (review, survey, email)
    Given the entry type is "Review"
    And the review text field contains content
    When I click "Analyse with AI"
    Then Sentiment, Tags, and WTP signal are populated
    And Key quotes and JTBD are populated where meaningful
    And Problem severity and Adoption willingness are populated

  Scenario: AI analysis does not auto-save
    Given AI has populated all analysis fields
    When I click "Cancel"
    Then no entry is created or updated
    And all populated fields are discarded

  # --- Metrics display ---

  Scenario: Interview coaching metrics shown on entry card
    Given an interview entry has speaker metrics from audio transcription
    When I view the entry in the discovery feed
    Then I see the InterviewMetricsPanel
    And it shows Interviewer and Interviewee talk share as progress bars
    And it shows IJL, ISR, and SPR with colour-coded thresholds
    And green/amber/red coaching signals indicate interview quality

  Scenario: Metrics panel not shown for non-audio entries
    Given an interview entry was created by pasting text only
    When I view the entry in the discovery feed
    Then the InterviewMetricsPanel is not shown

  # --- AI indexing ---

  Scenario: Rich AI context after saving an analysed entry
    Given I have saved an entry with AI-populated fields
    When the OS assistant is asked about customer signal
    Then it can reference JTBD, key quotes, tags, WTP signal, problem severity, and adoption willingness
    And semantic search finds the entry by JTBD and key quote language, not only raw transcript text

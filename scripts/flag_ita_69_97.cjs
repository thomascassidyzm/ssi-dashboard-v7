require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const phraseIds = [
"016448c7-2329-47e4-a10f-6c634db136f0", "030b93e2-dde0-4fc7-88b9-13ca1ba4338d", "035dcfb7-a13b-42fd-ae99-de5b83b93644",
"0a3a7129-5874-43e9-beec-c4f0a126c39a", "0ed47879-2986-41d2-bdec-ead6638ddc64", "0f6c740e-ae74-499d-a429-d03d7505d100",
"0fa07fc4-f2e6-4f99-97ae-a3188b8f4e71", "13b8b9e4-845d-4213-bd26-ca0ab349efde", "204a2795-2ed9-4af9-b358-556dbb1ed82c",
"2670a1a3-c675-4e17-8797-77c9267725b8", "26b4437e-5b34-4c0c-b51e-a285795620d2", "291e379e-d604-423b-8eac-4a37283dff4f",
"2b3fc465-9b0f-4be1-a426-37310e499928", "2be743e9-621f-4b78-b646-0085284ef642", "34067371-eec3-410c-8fdf-7402eb511824",
"36482ae7-9f7d-49f9-be11-02b6d37b66dc", "3756c170-d5e5-4dd6-b031-5ccf87f8302b", "37f39306-d8f5-4bae-a81f-f77a4ee759b7",
"38ebec34-49f9-4971-809b-dbdc2b4df5f3", "3ad742d9-b920-4ba1-b142-51f8755b11c0", "3e4a531a-386d-4c5c-b0a1-e52bd22f0a42",
"41eb4aa3-d641-4699-99a3-772bfb066667", "43b6b385-6960-4454-a61c-15417718ea0d", "4b6fbe82-5359-4c85-8c54-546131d3e10c",
"4cb4795a-886e-4f38-8d67-76da99bb3dac", "4e10e7bb-f29a-4e0f-adb9-b0e3756add83", "4fcbbaca-5c55-4478-a11f-c0ae651e1c0d",
"5336507e-196a-4c14-a1f7-8d1e5e2b3698", "54aee680-4f55-4430-ae0a-e258139aa8a3", "5e580641-4d71-42de-972a-5dab79babc1f",
"5fb58782-1079-4c96-b45a-851e9a37c13d", "606df522-f7fb-4013-9ee2-2cea67a904aa", "6464e73f-0825-4a05-b76d-5816979621d8",
"6b4f87cd-5838-45a1-9e51-776b7d9c1c13", "71d2d943-0674-4f9f-9989-cdd8a65dbf89", "750fbe7f-cdc8-47c4-89e0-21bf20677465",
"75c276a2-a7cb-4327-b90e-acf28524aca3", "787b7110-33e0-4aa3-88de-4a5bd8ce0cfb", "7c14ab3f-b461-406f-aa0b-da4f29c964d1",
"7c3356f1-1487-4db0-9eb6-bb38ceb6ce29", "7e6f46a9-c96a-4f12-a2cd-45214ffbd6f4", "88626826-87c0-4c89-bf4a-6ce589c2fc12",
"899a4c2f-7a50-4e18-ab78-052f688d7101", "8a34b246-fcfd-4a51-8332-96f4c15063e2", "8a355de9-3ff0-4b05-af6f-f16068b7816a",
"8ccec9bc-4d3e-495e-91b6-8c8af702bc19", "8fa064cd-7591-42c3-999b-0b85d2b96eda", "912bac64-4d3b-4e1e-bb3c-9bf3bd3151bb",
"92913d36-ae5d-4a29-bb57-81536244ac25", "94f171f9-1018-4c4e-b4a6-907c32f4ec86", "963bdb73-3958-463e-b579-ae70f1e6d774",
"96e32f7d-827f-47e3-821b-796ad125d356", "a295a3ff-38f6-4419-93f7-eefcdf7a46a9", "a5ec3053-a1d6-4387-a9cc-fe9a8366e388",
"a552edf2-c241-43b7-a42e-fd5fe5bb2505", "a61f598e-e7e6-456b-9357-b2885f03f72d", "b01bffe9-9256-475c-8ce5-7bd750005205",
"b1a1fd98-6d7c-4b05-8d67-5a87b2aaa0dc", "b4d4168e-9653-47ce-82f2-987af82c4a3f", "b7784d67-f883-4c89-97af-c5e3729d6cdf",
"b88e169c-91d6-4b8e-bf9e-feefb4dd977d", "ba089f34-d253-4faa-9634-6c4ca2b84167", "bb106baf-1a02-4e6f-85a9-00040079bf58",
"be1a4229-81c2-4139-8a59-453afa6b28d7", "be6e755c-38c1-4838-961d-5f0cba267652", "c41528c0-a857-4d2d-8194-7f3f72386d15",
"c52d8e77-4806-4cce-a6a7-c7882ae5d75e", "c58a95d6-0693-4107-99b1-3752bc9d3de5", "c6bc5e7c-e285-45c1-a28d-5166c3e01147",
"c6d55423-a29c-4409-adfc-5dc7b9c9dc65", "c8aab5bf-420b-4e6f-af02-9d74822c3762", "c8ee6be1-6a04-4444-814b-caefaeba9fff",
"ca97f88f-0ae7-41f3-aad0-8c2456f2d40d", "cb74e6cd-b029-4fca-84d1-d6e3e540e857", "d128fc91-744e-4519-baa5-34b06dc8a902",
"d2161ceb-9c95-4572-b75f-652abddfda7b", "d271e466-613c-438d-904e-b347748f1d49", "d363b558-111f-498a-99be-e7516ae7de8d",
"d3f26cff-0d1d-4035-9642-18a0a5635a8b", "d4382c88-38b9-4cf1-8fcd-6ec8db509e0c", "d62998d5-8126-4964-a274-82e0594d8a05",
"d9e7f3b4-54f8-41a3-a2d1-9a3db7e5722a", "dc12c94e-bc84-4ed1-960e-81d5db8e2633", "dd53f740-f86b-4187-9ad5-1e1944398386",
"e448499f-eb00-49a7-a9df-80460c44be6b", "e8327596-a2ec-4b89-902a-7b5bd18ff52b", "ed609f64-e7bf-4fb9-9a9d-46da7101c3cf",
"f1e0ab39-eb8e-4714-9d2e-104d92938cd9", "f6c65f08-47cd-4a96-9b81-94c6c78586c5", "f7cf029f-756e-4407-8497-55275d483f16",
"fb4cb3fb-70ad-4767-90ed-77ba901f92ba", "fc19d5d2-7c5c-4bc1-a253-820e12cde035", "fc34360f-9764-46e2-9a76-8738b7d69104",
"fc890a80-8b5c-4aba-bc04-28defab99b9d"
];

async function flagPhrases() {
  console.log(`Flagging ${phraseIds.length} phrases...`);
  
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .update({ flag: 'qa_review' })
    .in('id', phraseIds)
    .eq('course_code', 'ita_for_eng');
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  console.log(`✓ Successfully flagged ${phraseIds.length} phrases`);
}

flagPhrases();

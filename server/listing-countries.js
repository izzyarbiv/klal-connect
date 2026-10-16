// Each listing outside the US given its country, once (approved by Eli,
// 2026-10-16), so the Country filter can find it. Worked out from the
// listing's tagline ("Mikvah in Paris, France"); a listing in a US state
// needs nothing written, since its state already says United States.
//
// Only the country is written, only on a listing that still has none, and
// the pass is recorded once finished, so a country changed later is never
// overruled. It runs on a cold start, so each pass stops after a few seconds
// and the next one picks up where it left off.
import { store } from './db.js';

const KEY = 'listing_countries_filled_2026_10_16';
const BUDGET_MS = 6000;

export const COUNTRY_FILL = {
  "France": [
    "fa13198aaba3426e8d4b4a8f", "ca9d73d7857743f692fb0b6b", "f7062b841dfd450d9037cf4a", "7f379f2cf0a142b39d5108dd",
    "0e99fb86cb614397a35f5560", "5363bfa52b504df7abc768fb", "b6b363320d1e463eb2f90c45", "d1fac4fa6fbb4bafa7699573",
    "f148922aa3764e89bddbcfaa", "42ebbc2d810343f39432dddc", "35279d0f484f4112901f3a7b", "f341c2a3664543419fc48e32",
    "36024e5f0e744635b3e4eeab", "7adb2c51db3446ff89e4cf35", "b08da1c9b9e040e0a1207963", "4fda8f7ee76f4e22a909e5ab",
    "8f931a7d28d24011af08970d", "99cccdd469e04c78911fe9f4", "11a80ecb31bb4b5bb49d6b7c", "869e395007ff40f3af31e579",
    "7e2a72efe4984560968d71f7", "cdeae563484843b593ed6ea2", "fccd75a0f0dd41a684ea96fc", "73c1cc4dc9524a639c707181",
    "dee0c8ab5e9a4e5fbdd5c9fa", "04448d5cf2764c97862ef760", "79970fdfc0c3442e8efc828b", "7a1405c0dbff45308ca3f2ee",
    "bc846df9457045a2a93d7f38", "c96a1734273e49ab91887915", "ad97cc25e5ae41c4bc54a7cc", "c85ad6ef30fc4fb989e9305c",
    "324e2a45a7194fee87dd492b", "637590ebd52140aeb184e8e3", "10d38a0e1a4d4a00be0aa954", "d975d00aed384b50aeb909b4",
    "97fccc7c6c044aa0961d58d6", "e19cf5ae6d5e406cb60b06d3", "cbb0c23f26924487a746fce0", "b0c91d4424fb4df0aaff8162",
    "1055598bbd84494c8c7d3a67", "b3a71cc8bfe946cca3560793", "c0373d883bc641709ff46ab3", "9ff870857b9147e7b37333a7",
    "bea6af908c1c47b98a38ce99", "891fd830b1694d7f8f1cf0e6", "6c1cb849ea6e49dbbdb3a0af", "e4a2e8f3626e4405a44e7a0b",
    "847979be3cec45e5b4e52842", "e5e86eaa5e084fadb610eef2", "336453d2303645bb9c8937e5", "e8f9a6e48d6b48249cb65776",
    "b2ff20a41f5a4ae7aa1e528b", "78cf304fbafe4c10a2d5af93", "1ba6ada445624b01ab30c3e3", "cbd0be940f3a41b4b5e50f9f",
    "bc3d083fa1dc4eb0935794e3", "8bcd43f50b8941c291a5447a", "22853e9f8b384ebda84fc85a", "c908892b1b2341329616e7e2",
    "1cb112b0f425487f9d0b2667", "0af1d2d0a00442ebb3fc5d06", "a863648aeb1b4136b7f47135", "94701a83b13048afafc6125d",
    "5949f18202804de9ac468cf2", "045c2ca70cbe4ac59c844d9c", "4935e1dfb33047f6afbe3b07", "a8a634bbe3fa422c8f108390",
    "7d907603251c4a3589a10981", "ec6a0c5d3adc4eb1a9d9f5bf", "f37496ee5c9e421a89f4636e", "f9fa75535c5d4b39b05afde7",
    "20b40c1c1eae4cc7bb768000", "15be8699d9984beaadc0a15a", "8a84cabf203c4cba8ea236c7", "ce221d35d9ba462daee33df0",
    "93061e6656a647ed9613bd04", "1eba118effcd4738a9d4b1a4", "91bdfaee0501476286942a50", "6e5fbde93c2f4c61bb31c910",
    "8ebd035dfc644cffabb79def", "81439d22fbce4904b44141ef", "4e8a3ef825394cebb17a2dd5", "5ba5ae9df0594100ab428289",
    "7bb94572d40145e4b494c824", "e85e8cb64bfc4fee86d97265", "aaa172fa48e74faea155a58e", "b6fc5466beeb40939c5abddc",
    "ba5f41e6ddad4448b3111f4e", "f6168e364c114681ad364778", "2530af7a64614386981610f3", "a1269630f24a4ffaa0b5fdcf",
    "5683f963b1764a4ebcdb7da7", "b09c50a81eac432784ab298b", "978d9703a5bb4ce8a3cbb793", "9755524bf7b14b0f92849f9a",
    "2c68039e51e24431a24d40fe", "ff118751082c4d8da53b0747", "12dbc56b413441f3b4cf35f2", "a3570bfdaa5e482394b5d860",
    "e67f0cd9068a460ab02f4c53", "c840759e820f4855817fe12a", "56e86e067b7e4acb8f18fa76", "b332352e465d4cdd91257109",
    "b777fe1c3e5d44fe99502814", "d77c0b4a81a94ce697abd187", "475ad97b5bac40fc84b2e75a", "a12d93c6471d417faa7ebffc",
    "ee48292924824b0ca7191542", "25178b1916b1456c8c55857d", "03e3226bb02a4ccba4b93069", "311500a8c9804a29b10ebb32",
    "847c331388d543a390ce3694", "6117fa0c80f946c8b182771a", "5b9eebc9eaa64638b7723010",
  ],
  "Israel": [
    "19f8b46372384c90ab87d58a", "3c7f04083bc44446b1b1a42c", "8df6514a62a34278a58a54f5", "4a60ded9d0924f7cb4c3273d",
    "5c0f1c3b25a847b998fdeec4", "40c9ed13ac1a483a83780042", "6652e48b066a423494a3dc67", "6f531fbd61d14292a20a5235",
    "a56a9727ddb14e7d87922b1a", "cc3b4294c8a3400d94639336", "e6ee1a0c59484b83bc1a060c", "9d7b6f93024c433ea62876cf",
    "d151afe0aeff4cb48ec37e25", "e5748aa6226a46b3907461b9", "ef8729d165c7431d9b03a9d1", "493e3f51f91a457f9deb12e1",
    "bfb9315766d64460be03db28", "1c3ddc2851924a1282572845", "af55bcd2fe4049cea295a07a", "5a090c1f4f234b6bb2d86865",
    "aeca688148d64b21a288957b", "42997d2c417a4e6f94d59571", "5d3b7e1b0bb74eb1b00fafc8", "e54c1d687cc34ea1b723eb15",
    "78a76422702e40c0917f1fc3", "d2260ed8a3f34395a6f667cf", "6bd3b2a1e6c84dd1b2d31ea5", "88eec44ea6724c57a22223ce",
    "7c174be451ca4bc79d2a6d7b", "77e84171fbae4088b209e2cc", "a370e18662b44f82b501598d", "7b2bce8bcdcc41eb9e25bd1a",
    "f177b483f4904494a4e21f5d", "fe683ef9f51f4cea90fba948", "d174a02afa14452aae93cc30", "cc610871baf741279dbaf25a",
    "ac455d0cb3f842a48db4d398", "30cc7eca4bd54b82b8c4ea85", "a93320129a2144daa5ead7f7", "eea0643b05a84978b9873112",
    "6a484054e99c4d86b960e3df", "0747ffdadd4544b8b01b3046", "caf57582fca2437b940c2a5d", "05e9d1bc66094ec9a633faed",
    "499689bcbd7b4e02ad9c8651", "797c4774d209408f96bd3b1b", "99839ec9e3584c3fb854528a", "b129995ac959426289390e35",
    "b94723cf568944edb1dc627a", "5c6b2b3ba8eb4eef90fb342f", "8877b54d5f8949828b5c840b", "90988b50084d40f090cabbdd",
    "6d3b3d904f0a48c2b143e602", "886554c15d22460c973ab4be", "55894f1aa814446fb4f161c1", "cfcbda7b60864f4b819ee2db",
    "c72e59df01df4006b7af4f7a", "fda41f93992048899402313a", "38456e379d1d4fb7b78e9e01", "6d92113f3414409e832e08eb",
    "733c04c541e4425987553e53", "66561c16863b4fb68948e494", "6f9bc98e7c6b445b9d7aa721", "416e16b72e8d4f419439e8d9",
    "ac605140a4ab4205ac64e0a5", "67b0432f43a4486f81c38c0a", "8e5d6744111c47139b2dda1e", "78991930ed204d788027b7f7",
    "85c8586c5f7f412396a9e1a2", "d85ca09aa9604c8b91967095", "d83b4530e3d14b0fbf361b07", "2a997db4f17f409eb72aee74",
    "cbd8d840a64a42c0a35d0cf8", "5b45e902c4184e5f832b81e1", "3b8b42113ee34cf8aff8e2bf", "8d2ca6f9cbf84246886e9a80",
    "cb820f78ffb2486497bd9fb1", "db4e01b945ce45c8860dbad5", "a523e814ca2e48178ee85c31", "a9f155d5ec0444ce91f2900e",
    "28053cfc46cd49439f371456", "679e9baccb7949cdb29b9df0", "f5f1dca63ef54f7f8f23700c", "d81942d1af7e4d2a9d9707d0",
    "47be41c2b035468faad29342", "3c783a0f9bb04c99b3275dfc", "ceb942a926c54b1ab2dfe789", "fa066b7cd29f4c3e91df728f",
    "c34ad09ad64b434da571cd8b", "a8dfa333a76d4fdfa50a54a1",
  ],
  "Canada": [
    "a68fae29abb5429d98236297", "0fe0428893584de8abf85063", "fec4db3b18cb46aab148bb62", "30ce6890ea214cfb81fe26c1",
    "a64b065b5d5f4e5390a0d3d7", "11fb54df3b8c487aac451e7c", "ff6b90257a614018b3561da9", "730308828dfa4d98ab54ea03",
    "cd8afc6131ae4249a4d9fa3e", "e8934d585205405b8ea383b1", "afb42482a234428db44a8446", "25b09401983d4e57b9e49c88",
    "aabaa4850220410fa6838921", "ccf1f310f78a401fbd886386", "58111270a69b404ea9eeabab", "adafef4cf4fa4c6b906e6a91",
    "b84d8775b29940cdb9f9e5cd", "7813afd2562a49efa91f7500", "33fecf3b1b554149a493862f", "5f729d86f51542cba95cae75",
    "96fc393244a9412186070a89", "2b006e8483e748988f1dc5a8", "5536d17449d448cd9004ded2", "788757ea6ab34ea28a4c5e10",
    "803302455ad74c5f8180c267", "efd4857231344645a3a59f82", "71089bab37bc4f4aad1e7e3b", "5f4bea854cf54e1ba6e4f5a0",
    "ad36ab66bba246aab0266e8b", "3817fbb35fc14986b02d1ac9", "ed650210c3e7403682874157", "c59b953cfc7f4f21b7f52b57",
    "9cdc1479693c4e0daff8fee2", "9721ad2591a747a18ebcb5b7", "4c85ba76f81340ed905295cc", "36a1e3c769104bc6b7c24be8",
    "6449cfa85dc84898a8402726", "6fcc325ae3ab4a94b7fd9ca9", "a17559af8a9049e8a1c8047b", "762cde6c12c548beb9b4b6bf",
    "b1933b1b5b9140d88fa4cec5", "175a30d1f8c44cdbb1b5f4f5", "73e11ecb8fae4e0b8c097133", "54d81ba3a47f45ffbc904361",
    "cdb4ff299e85452f82f6ba8a", "0e7debcdb4174e728c33523d",
  ],
  "Mexico": [
    "971b63578c9642f3bdda0e22", "5efe4eff8b7c4664bc87d409", "7bd7edefd7fb4f3a8372ded2", "7cf7aaa9dd69456183959a3d",
    "b185067f8556425cb43f8b63", "c8c87b14e2334fc5b3998e26", "9c9fcc38eb814cb98a9960cf", "8b8bd08a949f4d40a70383a3",
    "6f9ccc42f7274a999a6277c7", "cbdfe355f8c54fe89bd4ecd0", "8cdf726baac44926b30e2c49", "7e1417140f4944e0916b5d77",
    "464c0ac2cf414f1d9aabac02", "99dd82e1521f452b81a9548f", "bd063de0e8e743479089810d", "90b27eebf3824749be86d7d4",
    "ae0a4b1dc81446f08472bced", "2399472f544f4a809b955c8a", "de99161a1a2f446cb71fa39c", "2ee257604aba4759aef2dca4",
    "e21d39a1e15a4f65810a6875", "e5855bbe6f3244209d5fce02", "334d8858e1d14e0c91314687", "361fc5da440b4a948a89e026",
    "e37f933f526a4181bd49accc", "34218539ccba4d3db04b3416", "c70e4972f9fd414e9e619108", "a24b8d5c05524aada03fe485",
    "817e772ef2e04501a658deed", "ba1044aa027947eab82a9ff0", "1a4dc521ff774cbca26c8b88", "21358f63e9954e70bcb9bcc4",
    "3a780c37624a4199b70d46cb", "52c135a535c4414a87afbccb", "45a25eeb481f4abf8d6d7340", "a1840a5f2ac34a5f8d2571ab",
    "63ce190af66848c3b3d10920", "388855c3f25b42d486caacaa", "f97b47151f0443b0b93f3e5d", "493dcbdaf44148daa0cd3805",
    "ab33269adcca43a3aee04893", "3c913d76db5147af81bab508", "4dacda4ff5b44511a48aee26", "a52914b1b1cf46c1ba202365",
    "94b2a57ae55c48f682e9f540",
  ],
  "United Kingdom": [
    "6cc959124ff74e66b162d0c6", "bb03e04ed4564e76917a62ae", "a502dd47583e49eda03b215a", "03043968d9674100828b7c8d",
    "dbdaf4986e8c4ec6afa0a9fb", "5fcde124ab81450bb9581971", "63178a80afdc4daebe369ec1", "46bd5193e25741bfa9a3c777",
    "be81ea91fc1a4273bdea0ddc", "c4c842536b43482a9dbc7bef", "092a32ee8f474991bff78b1a", "d0acedc0958949eeb5e0f99a",
    "8486b52239204f1ea75c5233", "2cf9995286734e878021b2d5", "c38e47c59cc44ecabdbf9290", "6cdb2334c7664ce2a4663e73",
    "bb2b1e60444c435d83d1694f", "d5e9339f2773497abf607f31", "774b135866624a23b5ec6de2", "e26334b439cb4033b9c430fe",
    "e51ad1d32d954302bb49b77b", "d958fe47887e4bb9ba87a081", "23271c8292a64d0c900fcb82", "81a9f1bbc9394f1284919bd5",
    "3b002274d3d8441ca8157162", "341b02c68a9e49fba432d020", "7077a8f7cd3e41e6903f6d7c", "3f082e234f494e78976f67fa",
    "6f839796761541618677eeba", "8c633b4f3b734a4eb583e008", "0a77c83f94ca4c1f97fa7306", "7e148c0ae1484bf2a6ebbf94",
    "313bd79181bb46c9b5ed29be", "6d266c07948d47e3a2ed13e0", "2b85d727714b47ba9e63b911", "ba29f9587bc0469ca5ea5314",
  ],
  "Brazil": [
    "05007a023b4d47aa90c38ddd", "5bb50e2c03e04b9a82630180", "c15c29df56284fccbfeff7f4", "c6c434312bbf4dafac2c0895",
    "f7db835a26c4440c8e7d8117", "9a41fe5e07a54ddcb273cc8b", "635f08f40fff478ab2bf51bd", "4d08d5c8821b4536965ebdc7",
    "cce362f074da489aa71b8745", "ca23eabde8f54dc6b25d0fa5", "ab0f27eec2e542cab3dd5c15", "58bc02ac0852456989000a2a",
    "963daba50aaf48e28d161084", "9aa143c037b240e3a7caa2aa", "4f7a9b709dd64198aeddf0c8", "d53bbe3db382456f978a8311",
    "a3371b9ff8c64b8aaace6416", "129e00f2ed6f4ade8e3a3ef1", "86f1b2b10853494ea97d08af", "f3ee942aae2549f9a316a69c",
    "b98a5057a05340dba5c7bfd4", "b0131890323b4797baabe188", "1b8a0746d3794b05a272be77", "c55c649c1f664d2fb348c170",
    "e1ba085e4881439393211230", "44909b47621d4e5fa3d671e0",
  ],
  "Ukraine": [
    "4d6591aa1e0846ac98129bc1", "fb95fd7b067f420a969a898a", "624013e81b3c4beda318cde1", "638e846f0d4448bf9ee1fa86",
    "e54e2a347d404d0c865ebdf4", "d4dcb140b52948c09cbe99fb", "c701579c778e4420a46cbfb2", "1439ee76809d426aa75057dc",
    "603cf33b2b034ea3bbe65930", "0bb383e6043e41dfb434ee02", "8441bab447c64de69c12a4f0", "fb13ff2f24d446f29d7b5b45",
    "9de96d68b19748cbb47495b6", "850bec62a68443faac7e8c3f", "4685a398146b4856b598d56d", "9a281ac2f0cf46bcb2eebabd",
    "15e1e8043b8044e4a9163665", "9eff071005a143ec86429f3e", "8149388e1ff543b1a961d593", "b9d2705d0a6d43c9b98e4624",
    "d8ed2e2715b44a2aa7707dae", "3be349540d674ae4b143817e", "3fd0f614240a49eb95d34d0f", "12acd4a7e4b64b2897e7affd",
    "1712df1a3e8f409ab05180d9",
  ],
  "Argentina": [
    "dc0d477f0d664d4a993bcdee", "eb8cc97a1730402eb2f20498", "fd7e1bef897c4916972501c1", "bf9b767338274aa79bfb3fec",
    "e859646560794f40b2d219c4", "9bed7084669c44b392184605", "33ede34e505f466d8360a141", "26584ae1b3dd44729b52cf24",
    "4dd54791132540f681035477", "78ea08bb225b4c479771d11f", "7c753104fd2e4cdf91f8c925", "7cf210b11577499db5b8101a",
    "a99cbf9b84e1478ba0b18352", "d9e34e846f054439897d82a0", "05a53ed17a984911b7673bea", "fc8f5f5e63a64423a04a3090",
    "386ac84724884eafa415908b", "9af0d832d59a4d0e846f77c5", "80d2d64b5f8048309f8568eb", "fdc62f4c255d4555865dd46c",
    "9b21b5b086394d4a9fd6ff4f",
  ],
  "Germany": [
    "a2c17f5b3d334181a50b617d", "0a7de645e6854a5ca7bd07a2", "877f283f345c48879a4856be", "06ec203281a74bab99849995",
    "db17d2bf89ad48a59fda5995", "acd7bdc2937341b488dfe825", "632aeb7a2e774d99a9c890fe", "3687064d2f824245bc2abac4",
    "aa091b0c4b91490082401240", "4bcbab2e0b2849079f3e7ece", "83a860c53dfd4106a968cea9", "75bf3c4e05ad47b499de7ef3",
    "83ea2015737540a192cc4ec1", "63ea502b467346f5b37d06c7", "0e4d1f8426ee47739d4c47ae", "cde4d2c0595b40c7b00f76ab",
    "bd8d89d977184715ac9993da", "f437287d01dd4c048bc724b3", "3546de0b77ee421490dda542",
  ],
  "Russia": [
    "d6e0ca95d6eb49ed9365ee65", "71f3c3bb72bb4c33a062ace9", "7bd7f20b40d64783a02c5436", "3d92800ef1be4014a0ea0d42",
    "556062c7b9584e75907923bd", "af7cbb85d5ff4c1e945288b4", "f69876cacde4462991002214", "20514daff99e45fa8a2dac07",
    "5426143194f942c892d232e6", "0db9a879c14447658076180b", "866972c5c8bf4d09a2f2d20a", "01c2629a7c444765b08ebcfd",
    "874853a27f234695bd388f18", "a4e6a9596ce04a389ffb6751", "1197dffc93a648c0bfe33818", "a3a25f1051284af89ee2cf54",
    "5c93a454db88499d8f77f500", "c10e1a042ca04840895af4a2", "8539a703503e42cea8a3a862",
  ],
  "Australia": [
    "5e3006442801434c8492dbe6", "2785624b08ee48119f8185e1", "0f19c35c05854bc5882b4853", "403b977db51546fc8ea4362b",
    "e488c66deeab4fd98d48401d", "91dfd379b2c34e078081d134", "333e4966083a46b38f6d5daa", "410827564f4b4cae9e5e34f6",
    "31f81e47944244f498d129e8", "d567c552e22d49ad942a6aab", "dce51d42bb6148079dce5809", "4b1e408d9757479889125193",
    "fe7549d1447747f39527827b", "bbd5e0967e7640ec8bd7d9bc", "c54e2f6e89b045ae88c4f8b9",
  ],
  "South Africa": [
    "9621d4f97178446e9d702c4c", "b4f120b4740f460d906d7931", "9dfebf3f10a246ada87c66d0", "8567b6b3bfba4abebf9198a5",
    "7681e3810d8a4899ae2a326c", "7f9f360e78054aa3b7ac4f47", "6c75c85c4d6b4114ace7616f", "0868a3931496436fb3f3fc4f",
    "a719a0883a224394a5434544", "2439250c78eb4f2d84393af0", "b664cf1fcc434280ac1a3596", "ad8363bcd28c4643998d7a41",
    "4905da45faf8482f9f00feba", "c8e4b31df08b4352b6dbd86c", "59d17a9a39404b7ab4eee34a",
  ],
  "Italy": [
    "0fa286e9206d4d5aa2568826", "0c3672cd9a464d07801f5dda", "d4d3562aef964acfacced3c6", "9449e62149954e4f910d59f9",
    "4dc7df044e8044a69e723489", "c948e5d02660424a92c535b2", "7425a88b4d5b466a94d91f63", "6c75820b90844a82b6dc1296",
    "211f97ed05194462bf94ea70", "3e2875dc5e4b4d0bb0be6869", "3001d0fde78849fbab69cd4f", "ce2efae5521240f79e2ce622",
    "3f950f0aa58a4f6dbae3dd69",
  ],
  "Switzerland": [
    "b9a2d4c29c4a41a19c68dc1e", "3f6be8826c604fe899fabf94", "1a8af90128a24047887c8249", "3ecc415c5b484522b18f3e27",
    "c9b62ee880a84f9693e89dc6", "51f8ef2756e14b3087b10c31", "3bf345a00af64de3a954d76c", "c95ccedb191a4685947108d5",
    "e478952d7c4942f689127c9b", "07f38185bf4a4c279150165b", "09c8321abdbe4eee8d720ffc", "671e96eda4b04832b142f835",
  ],
  "Morocco": [
    "defbb4fe2d7d4843a20a1a11", "f02e35a723bc44169e208cb1", "a7f026e7cb7d4e93a5c76762", "f38272b84e1540e4983dc3a3",
    "aa4d2586fd7c471bb7823771", "5457edb357f74acf80d309fa", "c2da23bdfe8941dc85b9af0b", "43e87f3ad5fe472684e925b5",
    "09de168f407948e8a2d2c1e9",
  ],
  "Colombia": [
    "f7be25e4ae4f418bb635cd92", "b75d075d4a204282bf364037", "c5d3bab19ff94f16ab2ba098", "e7d1d40c5b8e45189f0a40a1",
    "b31ee5a0ee97424fb6871b60", "2d66b2ecf4a34731ba9cdd7f", "f92d181f007b486fbf5f7fca", "0919ea52c21b44fdb4504101",
  ],
  "Spain": [
    "093688825b074faf9dbb6063", "d1f95d17955047cb979a3f29", "44d4f054291d4cbaa93cf226", "d5fd4d80ff6c4d39af24b092",
    "917a085fd3f24ab6a3c49862", "0d621b91c2f748549de417f0", "1606bd1217144282afcc26fb",
  ],
  "India": [
    "9c447099c8174adab34de144", "bd166f5efeab4b42a08856e1", "92cfd43a3ecc4bef8e9d6e54", "3944e186173b46f8a1d99103",
    "bc69f65b54694f138904ec02", "751bd66b7dbe4c2da54ac250",
  ],
  "Netherlands": [
    "7b65ea88d2f44a3ebc2ee7a8", "a8ed908194d44abeb909e3bb", "89f1720d37574e97b21cc2d5", "0cdf255b071b449196b429fa",
    "5abed02d47a9495883550b05", "b03598ba3663466489261972",
  ],
  "Belgium": [
    "f207b51704f042abbd46c825", "89b3b3f15fa14085bca65721", "1c5d6f98568d4958840c0132", "fd3cec03084b4a408a105b70",
    "a93d1a2d00974f0cb44df67a",
  ],
  "Japan": [
    "15c6d7a5f3a242dfb41f7610", "ed85df6f986c4863a6969e84", "4106ffd04e234871af8fa406", "9b124bc72d454399a68877ef",
    "47417a75ec5f4e83ba73cae8",
  ],
  "Panama": [
    "720afdea8e414980ba338dba", "05d4b375d4a7411eb9f9883d", "50345651beb54d1cb35176f4", "ee3148f46f694cbb988dc209",
    "f6a1897d63d44e95b4681ab2",
  ],
  "Chile": [
    "bdc7a84ecc604d4ca9d5dbd6", "d398609f7a0241509b2439ef", "75238b59fe054900a8f996f6", "79b27043dbd34762a9b30fc8",
  ],
  "Cyprus": [
    "6ba4d0e08c3446268f3d4c19", "c13fd89fc35844c48f4464e3", "edea5ecd6af54efea5110b9f", "0b25edd3065a4558822cc1a5",
  ],
  "Sweden": [
    "1b17ddc2cc8e4081a5a6c60e", "bf35a3cbdb994e9aa0633abc", "bf101992c3d94bea99d72481", "1ec94f2bea254533ba059058",
  ],
  "Uzbekistan": [
    "9d10705de6604593ac2ab3cd", "ee6e46079b624ec59ac7399e", "34a2c12186794c2d9c72b1e7", "1c2299ccb055473cb0c4253b",
  ],
  "Austria": [
    "f12466c8436a49818831697b", "f561db83700d48d8a8c38a2a", "23c8285e969140db81aea3a1",
  ],
  "Belarus": [
    "06712b09d1d54ce7845957ee", "70c63ee586ce48db863f8994", "ddaabaf09e0749ffb59bb440",
  ],
  "China": [
    "7eccb9223d4b4de9954453d4", "44f35156264a4c2aae2206d9", "f5b3ccd112414133aeb2eb96",
  ],
  "Philippines": [
    "92dbdc60594e4b7ca24c4813", "68bf06eb70d1409ab6e0a3ef", "a7c04ced576f471fb1784d87",
  ],
  "Portugal": [
    "83a4cd2b42f84a93af1552c3", "8b971b58e24c4b0da3056fe0", "a9eeda0410b34cbb891f1c86",
  ],
  "Uruguay": [
    "a96432530f42407483bfa3b4", "ccc6f88a6df44d348513dd20", "0c573b3ab8ce4d52877adcda",
  ],
  "Venezuela": [
    "444425e79807460f84e69005", "1d2ebc6e475d49c19e448548", "feefc8b0ed89405ebe6861f2",
  ],
  "Bulgaria": [
    "cc349ce57da24c85b67044f0", "dd61e4cb96e14b36b77e476d",
  ],
  "Costa Rica": [
    "cae12689f8ac4f00b5d98e1c", "e2dbf2d915c24c0a9cbf061e",
  ],
  "DR Congo": [
    "79f33a245b9b4444aeba4baa", "32a2408221ab466f89c53246",
  ],
  "Greece": [
    "008354150a97463db9666e30", "6286bd50a306494396fc7a30",
  ],
  "Lithuania": [
    "e07bc56450f141b59af18175", "aa45b20b542d4396931d2c85",
  ],
  "Moldova": [
    "9c17959811de455ea1a1dd48", "47d095bdd04e4094a8b408b3",
  ],
  "New Zealand": [
    "18edaa8ec6de463eac9c36a9", "50c176c0648b49a68834395a",
  ],
  "Poland": [
    "68ab7bb4753f42a899e00d1e", "57aa265e22824405bc57028b",
  ],
  "Puerto Rico": [
    "ef9f200f3779426a976beee1", "095edc9848e44f2896ac601e",
  ],
  "South Korea": [
    "da1b909a383541fa968d30cc", "fd8d3eead6f0451eb09476e2",
  ],
  "Thailand": [
    "de13dbe53ac0439eb1b03709", "8945cb92d04a44cbb340378c",
  ],
  "Azerbaijan": [
    "92ed47d505a1481eb47b4cb3",
  ],
  "Cambodia": [
    "692aa72cf0a04d52817a8079",
  ],
  "Croatia": [
    "409f1951b71b4a3e9eaaa374",
  ],
  "Czech Republic": [
    "504c39ee04ed45e9835d6962",
  ],
  "Denmark": [
    "b5e3fcee118e489888f64997",
  ],
  "Dominican Republic": [
    "5d9d058313cc4f7897772077",
  ],
  "Ecuador": [
    "26e7cb1186c54154af8b1115",
  ],
  "Estonia": [
    "32743686b45b45e0a1b6e0ba",
  ],
  "Finland": [
    "d1d24cc5b2f64592ab2ce660",
  ],
  "Georgia": [
    "4ed50ad1a111410c94fff5a2",
  ],
  "Gibraltar": [
    "65a687dd7dc541f9b6cfb5e4",
  ],
  "Guadeloupe": [
    "0dd8c6a9f3d44b6aab01dc5c",
  ],
  "Guatemala": [
    "85a4eeec71a24f2bbe992c15",
  ],
  "Hong Kong": [
    "a50740a7d94c43bca94cb3d8",
  ],
  "Hungary": [
    "5dae5b0394de42028c931d4a",
  ],
  "Ireland": [
    "2f5376ba28094391b0896c54",
  ],
  "Jamaica": [
    "a33c3d01d3c548af96d96da8",
  ],
  "Kazakhstan": [
    "38ebc8beab2a42ffa84b2061",
  ],
  "Kenya": [
    "7ead5d6abf854d55818562e5",
  ],
  "Latvia": [
    "136d5e37926243c8a4bcccbc",
  ],
  "Nigeria": [
    "bc017a6e29874b69af62f651",
  ],
  "Norway": [
    "e9f5f8acd8254667b5314ed8",
  ],
  "Paraguay": [
    "83f5427344b748068f51dee3",
  ],
  "Peru": [
    "3cb4f76a0ab84e3ea385c918",
  ],
  "Romania": [
    "e188131b104142ce8ee71749",
  ],
  "Serbia": [
    "244d427298f14f38a1c50056",
  ],
  "Singapore": [
    "4ad099f1e39c4f448987ee74",
  ],
  "Slovakia": [
    "d447d3e8c4564c61b34f68a5",
  ],
  "Taiwan": [
    "a25dc87fea21494d92ead3a3",
  ],
  "Tunisia": [
    "6fd1fec12c3941e48c60cedc",
  ],
  "Turkey": [
    "13029d08b65c4b0bae27a129",
  ],
  "United States": [
    "35033c563192442185c7fa89",
  ],
  "Vietnam": [
    "d37e2f0204c8445c8dada650",
  ],
  "Zimbabwe": [
    "d97f0c961ffa46d19a2d0903",
  ],
};

export async function fillListingCountries({ budgetMs = BUDGET_MS } = {}) {
  if ((await store.filter('Setting', { key: KEY })).length) return 0;
  const started = Date.now();
  const listings = new Map((await store.list('Provider')).map((p) => [p.id, p]));
  const todo = Object.entries(COUNTRY_FILL).flatMap(([country, ids]) => ids
    .filter((id) => listings.has(id) && !String(listings.get(id).country || '').trim())
    .map((id) => ({ id, country })));
  let filled = 0;
  for (let i = 0; i < todo.length; i += 10) {
    if (Date.now() - started > budgetMs) {
      console.log(`[listings] filled in the country of ${filled} listings; ${todo.length - filled} left for the next start`);
      return filled;
    }
    const batch = todo.slice(i, i + 10);
    await Promise.all(batch.map(({ id, country }) => store.update('Provider', id, { country })));
    filled += batch.length;
  }
  await store.create('Setting', { key: KEY, value: String(filled) });
  if (filled) console.log(`[listings] filled in the country of ${filled} listings`);
  return filled;
}

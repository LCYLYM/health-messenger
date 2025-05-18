"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, Copy, ArrowRight } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

// 默认的网站列表
const DEFAULT_WEBSITES = [
  // 成人内容网站
  { id: "1", url: "https://www.pornhub.com", name: "Pornhub", category: "adult" },
  { id: "2", url: "https://www.xvideos.com", name: "XVideos", category: "adult" },
  { id: "3", url: "https://www.xnxx.com", name: "XNXX", category: "adult" },
  { id: "4", url: "https://www.youporn.com", name: "YouPorn", category: "adult" },
  { id: "5", url: "https://www.redtube.com", name: "RedTube", category: "adult" },
  { id: "6", url: "https://www.tube8.com", name: "Tube8", category: "adult" },
  { id: "7", url: "https://www.spankbang.com", name: "SpankBang", category: "adult" },
  { id: "8", url: "https://www.xhamster.com", name: "xHamster", category: "adult" },
  { id: "9", url: "https://www.livejasmin.com", name: "LiveJasmin", category: "adult" },
  { id: "10", url: "https://www.chaturbate.com", name: "Chaturbate", category: "adult" },
  { id: "11", url: "https://www.cam4.com", name: "Cam4", category: "adult" },
  { id: "12", url: "https://www.myfreecams.com", name: "MyFreeCams", category: "adult" },
  { id: "13", url: "https://www.bongacams.com", name: "BongaCams", category: "adult" },
  { id: "14", url: "https://www.stripchat.com", name: "Stripchat", category: "adult" },
  { id: "15", url: "https://www.flirt4free.com", name: "Flirt4Free", category: "adult" },
  { id: "16", url: "https://www.adultfriendfinder.com", name: "AdultFriendFinder", category: "adult" },
  { id: "17", url: "https://www.onlyfans.com", name: "OnlyFans", category: "adult" },
  { id: "18", url: "https://www.brazzers.com", name: "Brazzers", category: "adult" },
  { id: "19", url: "https://www.reality-kings.com", name: "Reality Kings", category: "adult" },
  { id: "20", url: "https://www.bangbros.com", name: "BangBros", category: "adult" },
  { id: "21", url: "https://www.naughtyamerica.com", name: "Naughty America", category: "adult" },
  { id: "22", url: "https://www.digitalplayground.com", name: "Digital Playground", category: "adult" },
  { id: "23", url: "https://www.mofos.com", name: "Mofos", category: "adult" },
  { id: "24", url: "https://www.twistys.com", name: "Twistys", category: "adult" },
  { id: "25", url: "https://www.babes.com", name: "Babes", category: "adult" },
  { id: "26", url: "https://www.teamskeet.com", name: "TeamSkeet", category: "adult" },
  { id: "27", url: "https://www.fakehub.com", name: "Fakehub", category: "adult" },
  { id: "28", url: "https://www.pornhd.com", name: "PornHD", category: "adult" },
  { id: "29", url: "https://www.eporner.com", name: "EPorner", category: "adult" },
  { id: "30", url: "https://www.youjizz.com", name: "YouJizz", category: "adult" },
  { id: "31", url: "https://www.tnaflix.com", name: "TnaFlix", category: "adult" },
  { id: "32", url: "https://www.drtuber.com", name: "DrTuber", category: "adult" },
  { id: "33", url: "https://www.nuvid.com", name: "NuVid", category: "adult" },
  { id: "34", url: "https://www.ixxx.com", name: "iXXX", category: "adult" },
  { id: "35", url: "https://www.sunporno.com", name: "SunPorno", category: "adult" },
  { id: "36", url: "https://www.porn.com", name: "Porn.com", category: "adult" },
  { id: "37", url: "https://www.porn300.com", name: "Porn300", category: "adult" },
  { id: "38", url: "https://www.pornone.com", name: "PornOne", category: "adult" },
  { id: "39", url: "https://www.sexvid.xxx", name: "SexVid", category: "adult" },
  { id: "40", url: "https://www.thumbzilla.com", name: "Thumbzilla", category: "adult" },
  { id: "41", url: "https://www.zbporn.com", name: "ZBPorn", category: "adult" },
  { id: "42", url: "https://www.fuq.com", name: "Fuq", category: "adult" },
  { id: "43", url: "https://www.4tube.com", name: "4Tube", category: "adult" },
  { id: "44", url: "https://www.porntrex.com", name: "PornTrex", category: "adult" },
  { id: "45", url: "https://www.porndig.com", name: "PornDig", category: "adult" },
  { id: "46", url: "https://www.pornburst.xxx", name: "PornBurst", category: "adult" },
  { id: "47", url: "https://www.pornheed.com", name: "Pornheed", category: "adult" },
  { id: "48", url: "https://www.pornid.xxx", name: "PornID", category: "adult" },
  { id: "49", url: "https://www.pornhat.com", name: "PornHat", category: "adult" },
  { id: "50", url: "https://www.pornwhite.com", name: "PornWhite", category: "adult" },

  // 社交媒体
  { id: "51", url: "https://www.tiktok.com", name: "抖音国际版", category: "social" },
  { id: "52", url: "https://weibo.com", name: "微博", category: "social" },
  { id: "53", url: "https://www.douyin.com", name: "抖音", category: "social" },
  { id: "54", url: "https://www.kuaishou.com", name: "快手", category: "social" },
  { id: "55", url: "https://www.xiaohongshu.com", name: "小红书", category: "social" },
  { id: "56", url: "https://www.instagram.com", name: "Instagram", category: "social" },
  { id: "57", url: "https://twitter.com", name: "Twitter/X", category: "social" },
  { id: "58", url: "https://www.facebook.com", name: "Facebook", category: "social" },
  { id: "59", url: "https://www.snapchat.com", name: "Snapchat", category: "social" },
  { id: "60", url: "https://www.reddit.com", name: "Reddit", category: "social" },
  { id: "61", url: "https://www.discord.com", name: "Discord", category: "social" },
  { id: "62", url: "https://www.telegram.org", name: "Telegram", category: "social" },
  { id: "63", url: "https://www.pinterest.com", name: "Pinterest", category: "social" },
  { id: "64", url: "https://www.tumblr.com", name: "Tumblr", category: "social" },
  { id: "65", url: "https://www.threads.net", name: "Threads", category: "social" },
  { id: "66", url: "https://www.vk.com", name: "VK", category: "social" },
  { id: "67", url: "https://www.linkedin.com", name: "LinkedIn", category: "social" },
  { id: "68", url: "https://www.whatsapp.com", name: "WhatsApp", category: "social" },
  { id: "69", url: "https://www.line.me", name: "LINE", category: "social" },
  { id: "70", url: "https://www.kakaocorp.com", name: "KakaoTalk", category: "social" },
  { id: "71", url: "https://www.wechat.com", name: "微信", category: "social" },
  { id: "72", url: "https://www.qq.com", name: "QQ", category: "social" },
  { id: "73", url: "https://www.clubhouse.com", name: "Clubhouse", category: "social" },
  { id: "74", url: "https://www.mastodon.social", name: "Mastodon", category: "social" },
  { id: "75", url: "https://www.bluesky.app", name: "Bluesky", category: "social" },
  { id: "76", url: "https://www.minds.com", name: "Minds", category: "social" },
  { id: "77", url: "https://www.parler.com", name: "Parler", category: "social" },
  { id: "78", url: "https://www.gettr.com", name: "GETTR", category: "social" },
  { id: "79", url: "https://www.gab.com", name: "Gab", category: "social" },
  { id: "80", url: "https://www.mewe.com", name: "MeWe", category: "social" },
  { id: "81", url: "https://www.nextdoor.com", name: "Nextdoor", category: "social" },
  { id: "82", url: "https://www.caffeine.tv", name: "Caffeine", category: "social" },
  { id: "83", url: "https://www.likee.com", name: "Likee", category: "social" },
  { id: "84", url: "https://www.triller.co", name: "Triller", category: "social" },
  { id: "85", url: "https://www.houseparty.com", name: "Houseparty", category: "social" },
  { id: "86", url: "https://www.yubo.live", name: "Yubo", category: "social" },
  { id: "87", url: "https://www.bigo.tv", name: "BIGO LIVE", category: "social" },
  { id: "88", url: "https://www.tagged.com", name: "Tagged", category: "social" },
  { id: "89", url: "https://www.meetme.com", name: "MeetMe", category: "social" },
  { id: "90", url: "https://www.skout.com", name: "Skout", category: "social" },

  // 视频平台
  { id: "91", url: "https://www.youtube.com", name: "YouTube", category: "video" },
  { id: "92", url: "https://www.twitch.tv", name: "Twitch", category: "video" },
  { id: "93", url: "https://www.vimeo.com", name: "Vimeo", category: "video" },
  { id: "94", url: "https://www.ixigua.com", name: "西瓜视频", category: "video" },
  { id: "95", url: "https://www.huya.com", name: "虎牙直播", category: "video" },
  { id: "96", url: "https://www.douyu.com", name: "斗鱼直播", category: "video" },
  { id: "97", url: "https://www.bilibili.com", name: "哔哩哔哩", category: "video" },
  { id: "98", url: "https://www.iqiyi.com", name: "爱奇艺", category: "video" },
  { id: "99", url: "https://v.qq.com", name: "腾讯视频", category: "video" },
  { id: "100", url: "https://www.youku.com", name: "优酷", category: "video" },
  { id: "101", url: "https://www.mgtv.com", name: "芒果TV", category: "video" },
  { id: "102", url: "https://www.pptv.com", name: "PPTV", category: "video" },
  { id: "103", url: "https://www.dailymotion.com", name: "Dailymotion", category: "video" },
  { id: "104", url: "https://www.mixer.com", name: "Mixer", category: "video" },
  { id: "105", url: "https://www.dlive.tv", name: "DLive", category: "video" },
  { id: "106", url: "https://www.tiktok.com", name: "TikTok", category: "video" },
  { id: "107", url: "https://www.kwai.com", name: "Kwai", category: "video" },
  { id: "108", url: "https://www.netflix.com", name: "Netflix", category: "video" },
  { id: "109", url: "https://www.hulu.com", name: "Hulu", category: "video" },
  { id: "110", url: "https://www.disneyplus.com", name: "Disney+", category: "video" },
  { id: "111", url: "https://www.hbomax.com", name: "HBO Max", category: "video" },
  { id: "112", url: "https://www.peacocktv.com", name: "Peacock", category: "video" },
  { id: "113", url: "https://www.paramountplus.com", name: "Paramount+", category: "video" },
  { id: "114", url: "https://www.primevideo.com", name: "Amazon Prime Video", category: "video" },
  { id: "115", url: "https://www.appletv.apple.com", name: "Apple TV+", category: "video" },

  // 游戏网站
  { id: "116", url: "https://store.steampowered.com", name: "Steam", category: "gaming" },
  { id: "117", url: "https://www.epicgames.com", name: "Epic Games", category: "gaming" },
  { id: "118", url: "https://www.roblox.com", name: "Roblox", category: "gaming" },
  { id: "119", url: "https://www.minecraft.net", name: "Minecraft", category: "gaming" },
  { id: "120", url: "https://www.fortnite.com", name: "Fortnite", category: "gaming" },
  { id: "121", url: "https://www.leagueoflegends.com", name: "英雄联盟", category: "gaming" },
  { id: "122", url: "https://www.4399.com", name: "4399游戏", category: "gaming" },
  { id: "123", url: "https://www.7k7k.com", name: "7k7k游戏", category: "gaming" },
  { id: "124", url: "https://www.origin.com", name: "Origin", category: "gaming" },
  { id: "125", url: "https://www.ubisoft.com", name: "Ubisoft", category: "gaming" },
  { id: "126", url: "https://www.blizzard.com", name: "Blizzard", category: "gaming" },
  { id: "127", url: "https://www.rockstargames.com", name: "Rockstar Games", category: "gaming" },
  { id: "128", url: "https://www.ea.com", name: "Electronic Arts", category: "gaming" },
  { id: "129", url: "https://www.nintendo.com", name: "Nintendo", category: "gaming" },
  { id: "130", url: "https://www.playstation.com", name: "PlayStation", category: "gaming" },
  { id: "131", url: "https://www.xbox.com", name: "Xbox", category: "gaming" },
  { id: "132", url: "https://www.gog.com", name: "GOG", category: "gaming" },
  { id: "133", url: "https://www.battlenet.com", name: "Battle.net", category: "gaming" },
  { id: "134", url: "https://www.pubg.com", name: "PUBG", category: "gaming" },
  { id: "135", url: "https://www.callofduty.com", name: "Call of Duty", category: "gaming" },
  { id: "136", url: "https://www.valorant.com", name: "Valorant", category: "gaming" },
  { id: "137", url: "https://www.apexlegends.com", name: "Apex Legends", category: "gaming" },
  { id: "138", url: "https://www.dota2.com", name: "Dota 2", category: "gaming" },
  { id: "139", url: "https://www.csgo.com", name: "CS:GO", category: "gaming" },
  { id: "140", url: "https://www.gta5.com", name: "GTA 5", category: "gaming" },
  { id: "141", url: "https://www.worldofwarcraft.com", name: "World of Warcraft", category: "gaming" },
  { id: "142", url: "https://www.overwatch.com", name: "Overwatch", category: "gaming" },
  { id: "143", url: "https://www.hearthstone.com", name: "Hearthstone", category: "gaming" },
  { id: "144", url: "https://www.runescape.com", name: "RuneScape", category: "gaming" },
  { id: "145", url: "https://www.riotgames.com", name: "Riot Games", category: "gaming" },

  // 约会交友
  { id: "146", url: "https://www.tinder.com", name: "Tinder", category: "dating" },
  { id: "147", url: "https://bumble.com", name: "Bumble", category: "dating" },
  { id: "148", url: "https://www.tantan.com", name: "探探", category: "dating" },
  { id: "149", url: "https://www.soul.cn", name: "Soul", category: "dating" },
  { id: "150", url: "https://www.momo.com", name: "陌陌", category: "dating" },
  { id: "151", url: "https://www.okcupid.com", name: "OkCupid", category: "dating" },
  { id: "152", url: "https://www.match.com", name: "Match", category: "dating" },
  { id: "153", url: "https://www.zoosk.com", name: "Zoosk", category: "dating" },
  { id: "154", url: "https://www.eharmony.com", name: "eHarmony", category: "dating" },
  { id: "155", url: "https://www.pof.com", name: "Plenty of Fish", category: "dating" },
  { id: "156", url: "https://www.hinge.co", name: "Hinge", category: "dating" },
  { id: "157", url: "https://www.grindr.com", name: "Grindr", category: "dating" },
  { id: "158", url: "https://www.scruff.com", name: "Scruff", category: "dating" },
  { id: "159", url: "https://www.her.app", name: "HER", category: "dating" },
  { id: "160", url: "https://www.jdate.com", name: "JDate", category: "dating" },
  { id: "161", url: "https://www.christianmingle.com", name: "ChristianMingle", category: "dating" },
  { id: "162", url: "https://www.coffeemeetsbagel.com", name: "Coffee Meets Bagel", category: "dating" },
  { id: "163", url: "https://www.happn.com", name: "Happn", category: "dating" },
  { id: "164", url: "https://www.badoo.com", name: "Badoo", category: "dating" },
  { id: "165", url: "https://www.meetup.com", name: "Meetup", category: "dating" },

  // 论坛和讨论区
  { id: "166", url: "https://www.zhihu.com", name: "知乎", category: "forum" },
  { id: "167", url: "https://tieba.baidu.com", name: "百度贴吧", category: "forum" },
  { id: "168", url: "https://www.douban.com", name: "豆瓣", category: "forum" },
  { id: "169", url: "https://bbs.hupu.com", name: "虎扑", category: "forum" },
  { id: "170", url: "https://www.4chan.org", name: "4chan", category: "forum" },
  { id: "171", url: "https://www.quora.com", name: "Quora", category: "forum" },
  { id: "172", url: "https://www.reddit.com", name: "Reddit", category: "forum" },
  { id: "173", url: "https://www.9gag.com", name: "9GAG", category: "forum" },
  { id: "174", url: "https://www.imgur.com", name: "Imgur", category: "forum" },
  { id: "175", url: "https://www.lihkg.com", name: "LIHKG", category: "forum" },
  { id: "176", url: "https://www.dcard.tw", name: "Dcard", category: "forum" },
  { id: "177", url: "https://www.ptt.cc", name: "PTT", category: "forum" },
  { id: "178", url: "https://www.2ch.net", name: "2channel", category: "forum" },
  { id: "179", url: "https://www.5ch.net", name: "5channel", category: "forum" },
  { id: "180", url: "https://www.gamer.com.tw", name: "巴哈姆特", category: "forum" },
  { id: "181", url: "https://www.gamespot.com", name: "GameSpot", category: "forum" },
  { id: "182", url: "https://www.ign.com", name: "IGN", category: "forum" },
  { id: "183", url: "https://www.resetera.com", name: "ResetEra", category: "forum" },
  { id: "184", url: "https://www.neogaf.com", name: "NeoGAF", category: "forum" },
  { id: "185", url: "https://www.gamefaqs.com", name: "GameFAQs", category: "forum" },

  // 内容分享平台
  { id: "186", url: "https://www.wattpad.com", name: "Wattpad", category: "content" },
  { id: "187", url: "https://www.fanfiction.net", name: "FanFiction", category: "content" },
  { id: "188", url: "https://www.ao3.org", name: "Archive of Our Own", category: "content" },
  { id: "189", url: "https://www.jjwxc.net", name: "晋江文学城", category: "content" },
  { id: "190", url: "https://www.qidian.com", name: "起点中文网", category: "content" },
  { id: "191", url: "https://www.zongheng.com", name: "纵横中文网", category: "content" },
  { id: "192", url: "https://www.17k.com", name: "17K小说网", category: "content" },
  { id: "193", url: "https://www.hongxiu.com", name: "红袖添香", category: "content" },
  { id: "194", url: "https://www.readnovel.com", name: "小说阅读网", category: "content" },
  { id: "195", url: "https://www.faloo.com", name: "飞卢小说网", category: "content" },
  { id: "196", url: "https://www.deviantart.com", name: "DeviantArt", category: "content" },
  { id: "197", url: "https://www.pixiv.net", name: "Pixiv", category: "content" },
  { id: "198", url: "https://www.artstation.com", name: "ArtStation", category: "content" },
  { id: "199", url: "https://www.behance.net", name: "Behance", category: "content" },
  { id: "200", url: "https://www.dribbble.com", name: "Dribbble", category: "content" },

  // 匿名社交
  { id: "201", url: "https://www.omegle.com", name: "Omegle", category: "anonymous" },
  { id: "202", url: "https://www.chatroulette.com", name: "Chatroulette", category: "anonymous" },
  { id: "203", url: "https://www.whisper.sh", name: "Whisper", category: "anonymous" },
  { id: "204", url: "https://www.yikyak.com", name: "Yik Yak", category: "anonymous" },
  { id: "205", url: "https://www.kik.com", name: "Kik", category: "anonymous" },
  { id: "206", url: "https://www.monkey.cool", name: "Monkey", category: "anonymous" },
  { id: "207", url: "https://www.chatous.com", name: "Chatous", category: "anonymous" },
  { id: "208", url: "https://www.chatib.com", name: "Chatib", category: "anonymous" },
  { id: "209", url: "https://www.chathub.com", name: "ChatHub", category: "anonymous" },
  { id: "210", url: "https://www.emeraldchat.com", name: "Emerald Chat", category: "anonymous" },

  // 加密货币和赌博
  { id: "211", url: "https://www.binance.com", name: "Binance", category: "crypto" },
  { id: "212", url: "https://www.coinbase.com", name: "Coinbase", category: "crypto" },
  { id: "213", url: "https://www.kraken.com", name: "Kraken", category: "crypto" },
  { id: "214", url: "https://www.huobi.com", name: "火币", category: "crypto" },
  { id: "215", url: "https://www.okex.com", name: "OKEx", category: "crypto" },
  { id: "216", url: "https://www.bet365.com", name: "Bet365", category: "gambling" },
  { id: "217", url: "https://www.888casino.com", name: "888 Casino", category: "gambling" },
  { id: "218", url: "https://www.williamhill.com", name: "William Hill", category: "gambling" },
  { id: "219", url: "https://www.betway.com", name: "Betway", category: "gambling" },
  { id: "220", url: "https://www.pokerstars.com", name: "PokerStars", category: "gambling" },

  // 暗网相关
  { id: "221", url: "https://www.torproject.org", name: "Tor Project", category: "darkweb" },
  { id: "222", url: "https://www.freenet.org", name: "Freenet", category: "darkweb" },
  { id: "223", url: "https://www.i2p2.de", name: "I2P", category: "darkweb" },
  { id: "224", url: "https://www.zeronet.io", name: "ZeroNet", category: "darkweb" },
  { id: "225", url: "https://www.tails.boum.org", name: "Tails", category: "darkweb" },

  // 其他可能不适合青少年的网站
  { id: "226", url: "https://www.163.com", name: "网易", category: "other" },
  { id: "227", url: "https://www.sina.com.cn", name: "新浪", category: "other" },
  { id: "228", url: "https://www.sohu.com", name: "搜狐", category: "other" },
  { id: "229", url: "https://www.ifeng.com", name: "凤凰网", category: "other" },
  { id: "230", url: "https://www.eastday.com", name: "东方网", category: "other" },

  // 电子烟和酒精
  { id: "231", url: "https://www.juul.com", name: "JUUL", category: "tobacco" },
  { id: "232", url: "https://www.vuse.com", name: "Vuse", category: "tobacco" },
  { id: "233", url: "https://www.blu.com", name: "blu", category: "tobacco" },
  { id: "234", url: "https://www.njoy.com", name: "NJOY", category: "tobacco" },
  { id: "235", url: "https://www.puffbar.com", name: "Puff Bar", category: "tobacco" },
  { id: "236", url: "https://www.budweiser.com", name: "Budweiser", category: "alcohol" },
  { id: "237", url: "https://www.heineken.com", name: "Heineken", category: "alcohol" },
  { id: "238", url: "https://www.jackdaniels.com", name: "Jack Daniel's", category: "alcohol" },
  { id: "239", url: "https://www.absolut.com", name: "Absolut", category: "alcohol" },
  { id: "240", url: "https://www.hennessy.com", name: "Hennessy", category: "alcohol" },

  // 极端内容
  { id: "241", url: "https://www.liveleak.com", name: "LiveLeak", category: "extreme" },
  { id: "242", url: "https://www.bestgore.com", name: "BestGore", category: "extreme" },
  { id: "243", url: "https://www.kaotic.com", name: "Kaotic", category: "extreme" },
  { id: "244", url: "https://www.theync.com", name: "TheYNC", category: "extreme" },
  { id: "245", url: "https://www.crazyshit.com", name: "CrazyShit", category: "extreme" },

  // 盗版内容
  { id: "246", url: "https://www.thepiratebay.org", name: "The Pirate Bay", category: "piracy" },
  { id: "247", url: "https://www.1337x.to", name: "1337x", category: "piracy" },
  { id: "248", url: "https://www.rarbg.to", name: "RARBG", category: "piracy" },
  { id: "249", url: "https://www.torrentz2.eu", name: "Torrentz2", category: "piracy" },
  { id: "250", url: "https://www.yts.mx", name: "YTS", category: "piracy" },
  { id: "251", url: "https://www.eztv.io", name: "EZTV", category: "piracy" },
  { id: "252", url: "https://www.limetorrents.info", name: "LimeTorrents", category: "piracy" },
  { id: "253", url: "https://www.torrentdownloads.me", name: "TorrentDownloads", category: "piracy" },
  { id: "254", url: "https://www.zooqle.com", name: "Zooqle", category: "piracy" },
  { id: "255", url: "https://www.nyaa.si", name: "Nyaa", category: "piracy" },

  // 黑客和网络安全
  { id: "256", url: "https://www.hackforums.net", name: "Hack Forums", category: "hacking" },
  { id: "257", url: "https://www.nulled.to", name: "Nulled", category: "hacking" },
  { id: "258", url: "https://www.crackingking.com", name: "Cracking King", category: "hacking" },
  { id: "259", url: "https://www.sinister.ly", name: "Sinister.ly", category: "hacking" },
  { id: "260", url: "https://www.blackhatworld.com", name: "Black Hat World", category: "hacking" },

  // 其他网站
  { id: "261", url: "https://www.wikileaks.org", name: "WikiLeaks", category: "other" },
  { id: "262", url: "https://www.pastebin.com", name: "Pastebin", category: "other" },
  { id: "263", url: "https://www.4shared.com", name: "4shared", category: "other" },
  { id: "264", url: "https://www.mediafire.com", name: "MediaFire", category: "other" },
  { id: "265", url: "https://www.mega.nz", name: "MEGA", category: "other" },
  { id: "266", url: "https://www.dropbox.com", name: "Dropbox", category: "other" },
  { id: "267", url: "https://www.box.com", name: "Box", category: "other" },
  { id: "268", url: "https://www.onedrive.live.com", name: "OneDrive", category: "other" },
  { id: "269", url: "https://www.drive.google.com", name: "Google Drive", category: "other" },
  { id: "270", url: "https://www.icloud.com", name: "iCloud", category: "other" },

  // 中国特色网站
  { id: "271", url: "https://www.baidu.com", name: "百度", category: "china" },
  { id: "272", url: "https://www.taobao.com", name: "淘宝", category: "china" },
  { id: "273", url: "https://www.jd.com", name: "京东", category: "china" },
  { id: "274", url: "https://www.tmall.com", name: "天猫", category: "china" },
  { id: "275", url: "https://www.pinduoduo.com", name: "拼多多", category: "china" },
  { id: "276", url: "https://www.alipay.com", name: "支付宝", category: "china" },
  { id: "277", url: "https://www.meituan.com", name: "美团", category: "china" },
  { id: "278", url: "https://www.dianping.com", name: "大众点评", category: "china" },
  { id: "279", url: "https://www.ctrip.com", name: "携程", category: "china" },
  { id: "280", url: "https://www.fliggy.com", name: "飞猪", category: "china" },
  { id: "281", url: "https://www.zhaopin.com", name: "智联招聘", category: "china" },
  { id: "282", url: "https://www.51job.com", name: "前程无忧", category: "china" },
  { id: "283", url: "https://www.lagou.com", name: "拉勾网", category: "china" },
  { id: "284", url: "https://www.liepin.com", name: "猎聘网", category: "china" },
  { id: "285", url: "https://www.58.com", name: "58同城", category: "china" },
  { id: "286", url: "https://www.ganji.com", name: "赶集网", category: "china" },
  { id: "287", url: "https://www.anjuke.com", name: "安居客", category: "china" },
  { id: "288", url: "https://www.lianjia.com", name: "链家", category: "china" },
  { id: "289", url: "https://www.ke.com", name: "贝壳找房", category: "china" },
  { id: "290", url: "https://www.fang.com", name: "房天下", category: "china" },
  { id: "291", url: "https://www.autohome.com.cn", name: "汽车之家", category: "china" },
  { id: "292", url: "https://www.dcdapp.com", name: "懂车帝", category: "china" },
  { id: "293", url: "https://www.yiche.com", name: "易车网", category: "china" },
  { id: "294", url: "https://www.xcar.com.cn", name: "爱卡汽车", category: "china" },
  { id: "295", url: "https://www.pcauto.com.cn", name: "太平洋汽车网", category: "china" },
  { id: "296", url: "https://www.eastmoney.com", name: "东方财富", category: "china" },
  { id: "297", url: "https://www.10jqka.com.cn", name: "同花顺", category: "china" },
  { id: "298", url: "https://www.jrj.com.cn", name: "金融界", category: "china" },
  { id: "299", url: "https://www.cnstock.com", name: "中国证券网", category: "china" },
  { id: "300", url: "https://www.hexun.com", name: "和讯网", category: "china" },
  { id: "301", url: "https://www.36kr.com", name: "36氪", category: "china" },
  { id: "302", url: "https://www.huxiu.com", name: "虎嗅网", category: "china" },
  { id: "303", url: "https://www.ithome.com", name: "IT之家", category: "china" },
  { id: "304", url: "https://www.cnbeta.com", name: "cnBeta", category: "china" },
  { id: "305", url: "https://www.geekpark.net", name: "极客公园", category: "china" },
  { id: "306", url: "https://www.ifanr.com", name: "爱范儿", category: "china" },
  { id: "307", url: "https://www.leiphone.com", name: "雷锋网", category: "china" },
  { id: "308", url: "https://www.tmtpost.com", name: "钛媒体", category: "china" },
  { id: "309", url: "https://www.iresearch.cn", name: "艾瑞网", category: "china" },
  { id: "310", url: "https://www.analysys.cn", name: "易观", category: "china" },
]

export default function CreatePage() {
  const router = useRouter()
  const [websites, setWebsites] = useState(DEFAULT_WEBSITES)
  const [newUrl, setNewUrl] = useState("")
  const [newName, setNewName] = useState("")
  const [trackingId, setTrackingId] = useState("")
  const [showCopyAlert, setShowCopyAlert] = useState(false)
  const [activeCategory, setActiveCategory] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  // 添加新网站
  const addWebsite = () => {
    if (!newUrl || !newName) return

    // 简单验证URL
    let url = newUrl
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url
    }

    const newWebsite = {
      id: Date.now().toString(),
      url,
      name: newName,
      category: "other",
    }

    setWebsites([...websites, newWebsite])
    setNewUrl("")
    setNewName("")
  }

  // 删除网站
  const removeWebsite = (id: string) => {
    setWebsites(websites.filter((site) => site.id !== id))
  }

  // 生成跟踪ID
  const generateTrackingId = () => {
    const id = Math.random().toString(36).substring(2, 10)
    setTrackingId(id)

    // 在实际应用中，这里应该将网站列表保存到数据库或localStorage
    localStorage.setItem(`tracking_${id}`, JSON.stringify(websites))

    return id
  }

  // 复制链接
  const copyLink = () => {
    const id = trackingId || generateTrackingId()
    const link = `${window.location.origin}/detect/${id}`
    navigator.clipboard.writeText(link)
    setShowCopyAlert(true)
    setTimeout(() => setShowCopyAlert(false), 3000)
  }

  // 查看结果
  const viewResults = () => {
    const id = trackingId || generateTrackingId()
    router.push(`/results/${id}`)
  }

  // 过滤网站
  const filteredWebsites = websites.filter((site) => {
    const matchesCategory = activeCategory === "all" || site.category === activeCategory
    const matchesSearch =
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.url.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // 获取所有类别
  const categories = [
    { id: "all", name: "全部" },
    { id: "adult", name: "成人内容" },
    { id: "social", name: "社交媒体" },
    { id: "video", name: "视频平台" },
    { id: "gaming", name: "游戏网站" },
    { id: "dating", name: "约会交友" },
    { id: "forum", name: "论坛讨论区" },
    { id: "content", name: "内容分享" },
    { id: "anonymous", name: "匿名社交" },
    { id: "crypto", name: "加密货币" },
    { id: "gambling", name: "赌博" },
    { id: "darkweb", name: "暗网相关" },
    { id: "tobacco", name: "电子烟" },
    { id: "alcohol", name: "酒精" },
    { id: "extreme", name: "极端内容" },
    { id: "piracy", name: "盗版内容" },
    { id: "hacking", name: "黑客" },
    { id: "china", name: "中国网站" },
    { id: "other", name: "其他" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-12">
      <div className="container mx-auto px-4">
        <Link href="/" className="text-green-700 hover:text-green-900 mb-8 inline-block">
          ← 返回首页
        </Link>

        <Card className="max-w-4xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-green-700">创建检测链接</CardTitle>
            <CardDescription>自定义您想要检测的网站列表，然后生成一个可以分享的链接</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="search">搜索网站</Label>
                    <Input
                      id="search"
                      placeholder="输入网站名称或网址搜索"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>网站类别</Label>
                    <select
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={activeCategory}
                      onChange={(e) => setActiveCategory(e.target.value)}
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">当前网站列表 ({filteredWebsites.length}个)</h3>
                <div className="grid gap-2 max-h-[400px] overflow-y-auto p-1">
                  {filteredWebsites.map((site) => (
                    <div key={site.id} className="flex items-center justify-between p-3 bg-white rounded-md border">
                      <div>
                        <p className="font-medium">{site.name}</p>
                        <p className="text-sm text-gray-500">{site.url}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeWebsite(site.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">添加新网站</h3>
                <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-2">
                    <Label htmlFor="website-url">网站地址</Label>
                    <Input
                      id="website-url"
                      placeholder="例如: www.example.com"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website-name">网站名称</Label>
                    <Input
                      id="website-name"
                      placeholder="例如: 示例网站"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={addWebsite}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!newUrl || !newName}
                    >
                      <Plus className="h-5 w-5 mr-1" /> 添加
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex-col space-y-4">
            {trackingId && (
              <div className="w-full p-3 bg-green-50 rounded-md border border-green-200 flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-800">您的检测ID:</p>
                  <p className="text-green-700 font-mono">{trackingId}</p>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  已生成
                </Badge>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button onClick={copyLink} className="flex-1 bg-green-600 hover:bg-green-700">
                <Copy className="h-5 w-5 mr-2" /> 生成并复制链接
              </Button>
              <Button
                onClick={viewResults}
                variant="outline"
                className="flex-1 border-green-600 text-green-700 hover:bg-green-50"
              >
                查看结果 <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>

            {showCopyAlert && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <AlertDescription>链接已复制到剪贴板！您可以将其分享给需要检测的人。</AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

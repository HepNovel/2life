import React, { Component } from 'react'
import {
  View,
  StyleSheet,
  TextInput,
  Keyboard,
  Alert,
  TouchableOpacity,
  Image,
  Animated,
  DatePickerIOS
} from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { connect } from 'react-redux'
import { Actions } from 'react-native-router-flux'
import Toast from 'antd-mobile/lib/toast'

import Container from '../../components/Container'
import TextPingFang from '../../components/TextPingFang'
import DiaryBanner from './DiaryBanner'

import {
  WIDTH,
  HEIGHT,
  getResponsiveWidth,
} from '../../common/styles'
import {
  getMonth,
  sleep,
  downloadImg,
  updateFile,
  syncFile
} from '../../common/util'
import { SCENE_INDEX } from '../../constants/scene'

function mapStateToProps(state) {
  return {
    user: state.user,
  }
}

@connect(mapStateToProps)
export default class UpdateDiary extends Component {

  state = {
    date: new Date(),
    title: '',
    content: '',
    showPopup: false,
    imgPathList: [],
    oldImgPathList: [],
    savingDiary: false,
    leftButton: null,
    datePickerY: new Animated.Value(-220),
    showDatePicker: false
  }

  componentWillMount() {
    const diary = this.props.diary
    this.setState({
      date: new Date(diary.date),
      title: diary.title,
      content: diary.content,
      imgPathList: diary.imgPathList,
      oldImgPathList : [...diary.imgPathList],
    }, () => this._renderLeftButton())
  }

  async saveDiary() {
    const isLogin = !!this.props.user.id

    if (this.state.savingDiary) return

    this.setState({savingDiary: true})

    const { title, content, imgPathList, date } = this.state

    if (!title && !content) return Actions.pop()
    if (!title) return Alert.alert('', '给日记起个标题吧')
    if (!content) return Alert.alert('', '日记内容不能为空哦')

    Toast.loading('正在保存', 0)

    await sleep(100)

    // 过滤已存在的图片
    let newImgPathList = [] // 新的未缓存图片
    let oldUseingImgPathList = [] // 更新日记继续使用的已缓存图片
    for(let i = 0; i < imgPathList.length; i++) {
      for(let j = 0; j < this.state.oldImgPathList.length; j++) {
        if (imgPathList[i] === this.state.oldImgPathList[j]) {
          oldUseingImgPathList.push(imgPathList[i])
          break
        }
        if (j === this.state.oldImgPathList.length - 1) {
          newImgPathList.push(imgPathList[i])
        }
      }
    }
    if(!this.state.oldImgPathList.length) {
      newImgPathList = imgPathList
    }
    // 复制图片文件
    let newPathListPromises = newImgPathList.map(async path => {
      return await downloadImg(path, this.props.user.id)
    })
    let newUsingImgPathList = []
    for (let newPathListPromise of newPathListPromises) {
      newUsingImgPathList.push(await newPathListPromise)
    }

    // 更新配置文件
    await updateFile({
      user_id: this.props.user.id || 0,
      action: 'update',
      data: {
        ...this.props.diary,
        title,
        content,
        date: date.getTime(),
        imgPathList: [...newUsingImgPathList, ...oldUseingImgPathList],
        op: this.props.diary.id ? 2 : 1
      }
    })

    isLogin && syncFile(this.props.user.id)

    Actions.reset(SCENE_INDEX)

    Toast.hide()
  }

  getImgPathList(imgPathList) {
    this.setState({imgPathList})
    this._renderLeftButton()
  }

  _renderLeftButton() {
    let source = this.state.imgPathList.length ?
      require('../../../res/images/home/diary/icon_back_white.png') :
      require('../../../res/images/home/diary/icon_back_black.png')

    const leftButton = (
      <TouchableOpacity onPress={this.saveDiary.bind(this)}>
        <Image source={source}/>
      </TouchableOpacity>
    )

    this.setState({ leftButton })
  }

  _selectDate() {
    this.setState({ showDatePicker: !this.state.showDatePicker }, () => {
      Animated.spring(
        this.state.datePickerY,
        {
          toValue: this.state.showDatePicker ? 0 : -220,
          duration: 300
        }
      ).start()
    })
  }

  render() {
    return (
      <Container hidePadding={true}>

        <Animated.View
          style={{
            position: 'absolute',
            bottom: this.state.datePickerY,
            backgroundColor: '#fff',
            zIndex: 100
          }}
        >
          <DatePickerIOS
            locale={'zh-Hans'}
            style={styles.date_picker}
            date={this.state.date}
            maximumDate={new Date()}
            mode={'datetime'}
            onDateChange={date => this.setState({date})}
          />
        </Animated.View>
        <TouchableOpacity
          style={[styles.mask, {display: this.state.showDatePicker ? 'flex' : 'none'}]}
          onPress={() => this._selectDate()}
        >
        </TouchableOpacity>

        <KeyboardAwareScrollView
          contentContainerStyle={styles.scroll_style}
          extraScrollHeight={0}
          enableResetScrollToCoords
        >
          <DiaryBanner
            showNav={true}
            showBanner={true}
            showBottomBar={true}
            leftButton={this.state.leftButton}
            onPressBack={() => this.saveDiary()}
            imgPathList={this.state.imgPathList}
            getImgPathList={this.getImgPathList.bind(this)}
          />

          <View style={styles.date_container}>
            <TextPingFang style={styles.text_date}>{getMonth(this.state.date.getMonth())} </TextPingFang>
            <TextPingFang style={styles.text_date}>{this.state.date.getDate()}，</TextPingFang>
            <TextPingFang style={styles.text_date}>{this.state.date.getFullYear()}</TextPingFang>
            <TouchableOpacity
              style={styles.small_calendar}
              onPress={this._selectDate.bind(this)}
            >
              <Image source={require('../../../res/images/home/diary/icon_calendar_small.png')}/>
            </TouchableOpacity>
          </View>


          <TextInput
            style={styles.text_title}
            value={this.props.diary.title}
            onChangeText={title => this.setState({ title })}
            placeholder='标题'
            placeholderTextColor='#aaa'
          />

          <View style={styles.line}></View>

          <TextInput
            style={styles.text_content}
            value={this.props.diary.content}
            onChangeText={content => this.setState({ content })}
            placeholder='请输入正文'
            placeholderTextColor='#aaa'
            multiline
          />

        </KeyboardAwareScrollView>

      </Container>
    )
  }
}

const styles = StyleSheet.create({
  mask: {
    position: 'absolute',
    width: WIDTH,
    height: HEIGHT,
    zIndex: 10
  },
  date_picker: {
    width: WIDTH,
  },
  date_container: {
    width: WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: getResponsiveWidth(24),
    paddingTop: getResponsiveWidth(24),
    paddingBottom: getResponsiveWidth(24),
  },
  scroll_style: {
    // height: HEIGHT,
    // backgroundColor: 'red'
  },
  text_date: {
    color: '#aaa',
    fontSize: 12
  },
  small_calendar: {
    marginLeft: getResponsiveWidth(8)
  },
  text_title: {
    color: '#000',
    fontSize: 24,
    paddingLeft: getResponsiveWidth(24),
    paddingRight: getResponsiveWidth(24),
    paddingTop: getResponsiveWidth(48),
    paddingBottom: getResponsiveWidth(48),
  },
  line: {
    width: getResponsiveWidth(40),
    height: getResponsiveWidth(1),
    marginLeft: getResponsiveWidth(24),
    backgroundColor: '#aaa'
  },
  text_content: {
    color: '#444',
    fontSize: 16,
    height: getResponsiveWidth(100),
    paddingLeft: getResponsiveWidth(24),
    paddingRight: getResponsiveWidth(24),
    marginTop: getResponsiveWidth(24),
    paddingBottom: getResponsiveWidth(24),
  },
})

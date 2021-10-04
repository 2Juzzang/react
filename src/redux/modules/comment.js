import { createAction, handleActions } from "redux-actions";
import { produce } from "immer";
import { firestore } from "../../shared/firebase";
import "moment";
import moment from "moment";
import firebase from "firebase/app";
import { actionCreators as postActions } from "./post";
//타입
const SET_COMMENT = "SET_COMMENT";
const ADD_COMMENT = "ADD_COMMENT";

const LOADING = "LOADING";

//액션
const setComment = createAction(SET_COMMENT, (post_id, comment_list) => ({post_id, comment_list}));
const addComment = createAction(ADD_COMMENT, (post_id, comment) => ({post_id, comment}));

const loading = createAction(LOADING, (is_loading) => ({ is_loading }));

const initialState = {
  list: {},
  is_loading: false,
};

//댓글 13, 파이어베이스에 댓글데이터 삽입
const addCommentFB = (post_id, contents) => {
    return function(dispatch, getState, {history}){
        const commentDB = firestore.collection("comment");
        const user_info = getState().user.user;

        let comment = {
            post_id: post_id,
            user_id: user_info.uid,
            user_name: user_info.user_name,
            user_profile: user_info.user_profile,
            contents: contents,
            insert_dt: moment().format("YYYY-MM-DD hh:mm:ss"),
        }

        //댓글 추가에 성공할 경우 then 수행
        commentDB.add(comment).then((doc) => {
            //댓글 14, 댓글 갯수 + 1, 파이어베이스에서 가져온다.
            const postDB = firestore.collection("post");
            // increment ()안의 숫자만큼을 현재 값에서 추가해줌.
            const increment = firebase.firestore.FieldValue.increment(1);
            // 리덕스에 있는 포스트 정보를 가져온다.
            const post = getState().post.list.find(l => l.id === post_id);

            comment = {...comment, id: doc.id};
            postDB
            .doc(post_id)
            .update({comment_cnt: increment})
            .then((_post) => {
                dispatch(addComment(post_id, comment));

                //댓글 15, 게시물 내의 댓글 개수 업데이트, 포스트 정보가 필요함
                //묵시적 형변환을 예방하기위해 괄호 안의 값을 숫자 데이터로 바꿔주는 parseInt 사용
                if(post){
                    dispatch(postActions.editPost(post_id, {comment_cnt: parseInt(post.comment_cnt)+ 1}));
                }
            })
        })
    }
}


//댓글 7, post_id가 없으면 안되게 if문으로 막는다.
const getCommentFB = (post_id = null) => {
    return function(dispatch, getState, {history}){
        if(!post_id){
            return;
        }
        //댓글 8, 코멘트 db를 받아오고
        const commentDB = firestore.collection("comment");
        commentDB
        .where("post_id", "==", post_id)
        .orderBy("insert_dt", "desc")
        .get()
        .then((docs) => {

            let list = [];
            docs.forEach((doc) => {
                // 빈 배열 list에 data와 id를 삽입 
                list.push({...doc.data(), id: doc.id});
            })
            //디스패치 해준다.
            dispatch(setComment(post_id, list));
        }).catch(err => {
            console.log("댓글 정보를 가져올 수가 없네요!", err)
        })
    }
}


export default handleActions(
  {
      [SET_COMMENT]: (state, action) => produce(state, (draft) => {
        //댓글 9, post_id라는 방을 만들고, comment_list를 넣는다.
        draft.list[action.payload.post_id] = action.payload.comment_list;
      }),
      [ADD_COMMENT]: (state, action) => produce(state, (draft)=> {
        draft.list[action.payload.post_id].unshift(action.payload.comment);
      }),
      [LOADING]: (state, action) => 
      produce(state, (draft) => {
        draft.is_loading = action.payload.is_loading;
      })
  },
  initialState
);

const actionCreators = {
  getCommentFB,
  addCommentFB,
  setComment,
  addComment,
};

export { actionCreators };
export function percant(number1:number,number2:number){
  let number = (number2/100 );
  let discoubt_number = (number*number1)
  let final = number1 - discoubt_number
  return final
}
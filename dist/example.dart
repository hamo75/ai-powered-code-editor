// Example Dart file with various issues for testing the analyzer
import 'dart:async';

// TODO: Add proper error handling
void main() {
  // FIXME: This needs optimization
  print('Starting application...');
  
  final user = new User('John'); // Info: unnecessary 'new' keyword
  
  dynamic result = getUserData();
  
  if (result == null) { // Warning: use null-aware operators
    print('No data found');
  }
  
  var counter = const Counter(0); // Warning: use const instead of var
  
  // Try without proper exception handling
  try {
    processData()
  } catch (e) {
    print(e);
  }
  
  // Info: Class naming should be PascalCase
  class userModel {
    String name = '';
    int age = 0;
    
    // Info: Function naming should be camelCase
    void GetUserDetails() {
      print('Getting user...');
    }
  }
  
  // HACK: This is a quick fix, needs refactoring
  var x = 5;
  var y = 10;
  var sum = x + y
  
  // Info: Unmatched closing bracket example
  print('Sum: $sum');
}

class User {
  String name;
  
  // Info: Missing explicit return type
  User(this.name);
}

class Counter {
  final int value;
  
  const Counter(this.value);
}

// Warning: Using dynamic type
void processData() {
  dynamic data = {'key': 'value'};
  print(data);
}

// Info: Missing return type
Future<String> getUserData() async {
  await Future.delayed(Duration(seconds: 1));
  return 'user data';
}

// NOTE: Review this implementation
void anotherFunction() {
  var msg = 'hello'
  print(msg);
}
